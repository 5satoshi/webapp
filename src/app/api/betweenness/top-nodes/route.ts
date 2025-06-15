
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getBigQueryClient, ensureBigQueryClientInitialized, projectId, datasetId } from '@/services/bigqueryClient';
import { logBigQueryError } from '@/lib/bigqueryUtils';
import type { AllTopNodes, SingleCategoryTopNode } from '@/lib/types';

async function fetchTopNodesForCategoryAPI(primaryCategory: 'micro' | 'common' | 'macro', limit: number = 3): Promise<SingleCategoryTopNode[]> {
  await ensureBigQueryClientInitialized();
  const bigquery = getBigQueryClient();

  if (!bigquery) {
    logBigQueryError(`API fetchTopNodesForCategory (${primaryCategory})`, new Error("BigQuery client not available."));
    return [];
  }

  const topNodeIdsQuery = `
    WITH RankedNodesForPrimaryCategory AS (
      SELECT
        nodeid,
        alias, 
        shortest_path_share,
        rank,
        ROW_NUMBER() OVER(PARTITION BY nodeid ORDER BY timestamp DESC) as rn_latest_for_node_in_category
      FROM \`${projectId}.${datasetId}.betweenness\`
      WHERE type = @primaryCategoryType
    )
    SELECT nodeid, alias as primary_alias, shortest_path_share as primary_share, rank as primary_rank
    FROM RankedNodesForPrimaryCategory
    WHERE rn_latest_for_node_in_category = 1 
    ORDER BY primary_share DESC, primary_rank ASC NULLS LAST, nodeid ASC
    LIMIT @limitValue
  `;

  let topNodesPrimaryData: Array<{ nodeid: string, primary_alias: string | null, primary_share: number | null, primary_rank: number | null }> = [];
  try {
    const [job] = await bigquery.createQueryJob({
      query: topNodeIdsQuery,
      params: { primaryCategoryType: primaryCategory, limitValue: limit }
    });
    topNodesPrimaryData = (await job.getQueryResults())[0] as Array<{ nodeid: string, primary_alias: string | null, primary_share: number | null, primary_rank: number | null }>;
  } catch (error) {
    logBigQueryError(`API fetchTopNodesForCategory (${primaryCategory}) - Step 1`, error);
    return [];
  }

  if (topNodesPrimaryData.length === 0) {
    return [];
  }

  const nodeIds = topNodesPrimaryData.map(n => n.nodeid);

  const allStatsForTopNodesQuery = `
    WITH LatestStatsForAllTypes AS (
      SELECT
        nodeid,
        type,
        alias,
        shortest_path_share,
        rank,
        ROW_NUMBER() OVER(PARTITION BY nodeid, type ORDER BY timestamp DESC) as rn_latest_for_type
      FROM \`${projectId}.${datasetId}.betweenness\`
      WHERE nodeid IN UNNEST(@nodeIdList)
        AND type IN ('micro', 'common', 'macro')
    ),
    LatestOverallAlias AS ( 
      SELECT
        nodeid,
        alias,
        ROW_NUMBER() OVER(PARTITION BY nodeid ORDER BY timestamp DESC) as rn_overall_alias
      FROM \`${projectId}.${datasetId}.betweenness\`
      WHERE nodeid IN UNNEST(@nodeIdList) AND alias IS NOT NULL AND TRIM(alias) != ''
    )
    SELECT
      s.nodeid,
      loa.alias AS display_alias, 
      MAX(IF(s.type = 'micro', s.shortest_path_share, NULL)) as micro_share,
      MAX(IF(s.type = 'micro', s.rank, NULL)) as micro_rank,
      MAX(IF(s.type = 'common', s.shortest_path_share, NULL)) as common_share,
      MAX(IF(s.type = 'common', s.rank, NULL)) as common_rank,
      MAX(IF(s.type = 'macro', s.shortest_path_share, NULL)) as macro_share,
      MAX(IF(s.type = 'macro', s.rank, NULL)) as macro_rank
    FROM LatestStatsForAllTypes s
    LEFT JOIN LatestOverallAlias loa ON s.nodeid = loa.nodeid AND loa.rn_overall_alias = 1
    WHERE s.rn_latest_for_type = 1
    GROUP BY s.nodeid, loa.alias
  `;

  let allStatsRows: Array<any> = [];
  try {
    const [job] = await bigquery.createQueryJob({
      query: allStatsForTopNodesQuery,
      params: { nodeIdList: nodeIds }
    });
    allStatsRows = (await job.getQueryResults())[0];
  } catch (error) {
    logBigQueryError(`API fetchTopNodesForCategory (${primaryCategory}) - Step 2`, error);
  }
  
  const results: SingleCategoryTopNode[] = topNodesPrimaryData.map(primaryNode => {
    const allStats = allStatsRows.find(s => s.nodeid === primaryNode.nodeid);
    let categoryShare: number | null = null;
    let categoryRank: number | null = null;

    if (allStats) {
        switch (primaryCategory) {
            case 'micro': categoryShare = Number(allStats.micro_share); categoryRank = Number(allStats.micro_rank); break;
            case 'common': categoryShare = Number(allStats.common_share); categoryRank = Number(allStats.common_rank); break;
            case 'macro': categoryShare = Number(allStats.macro_share); categoryRank = Number(allStats.macro_rank); break;
        }
    } else {
        categoryShare = primaryNode.primary_share;
        categoryRank = primaryNode.primary_rank;
    }

    return {
      nodeid: primaryNode.nodeid,
      alias: allStats?.display_alias || primaryNode.primary_alias || null,
      categoryShare: categoryShare,
      categoryRank: categoryRank,
      microShare: allStats?.micro_share !== null && allStats?.micro_share !== undefined ? Number(allStats.micro_share) : null,
      microRank: allStats?.micro_rank !== null && allStats?.micro_rank !== undefined ? Number(allStats.micro_rank) : null,
      commonShare: allStats?.common_share !== null && allStats?.common_share !== undefined ? Number(allStats.common_share) : null,
      commonRank: allStats?.common_rank !== null && allStats?.common_rank !== undefined ? Number(allStats.common_rank) : null,
      macroShare: allStats?.macro_share !== null && allStats?.macro_share !== undefined ? Number(allStats.macro_share) : null,
      macroRank: allStats?.macro_rank !== null && allStats?.macro_rank !== undefined ? Number(allStats.macro_rank) : null,
    };
  });
  
  results.sort((a, b) => {
    const aShare = a.categoryShare ?? -1;
    const bShare = b.categoryShare ?? -1;
    if (bShare !== aShare) return bShare - aShare; 
    const aRank = a.categoryRank ?? Infinity;
    const bRank = b.categoryRank ?? Infinity;
    return aRank - bRank; 
  });
  return results;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 3;

    if (isNaN(limit) || limit <= 0) {
      return NextResponse.json({ error: 'Invalid limit parameter' }, { status: 400 });
    }

    await ensureBigQueryClientInitialized();
    const [microNodes, commonNodes, macroNodes] = await Promise.all([
      fetchTopNodesForCategoryAPI('micro', limit),
      fetchTopNodesForCategoryAPI('common', limit),
      fetchTopNodesForCategoryAPI('macro', limit),
    ]);
    
    const responseData: AllTopNodes = {
      micro: microNodes,
      common: commonNodes,
      macro: macroNodes,
    };
    return NextResponse.json(responseData);
  } catch (error: any) {
    logBigQueryError('API /api/betweenness/top-nodes', error);
    return NextResponse.json({ error: 'Failed to fetch top nodes data', details: error.message }, { status: 500 });
  }
}
