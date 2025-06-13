
'use server';

import type { NetworkSubsumptionData, AllTopNodes, SingleCategoryTopNode, OurNodeCategoryRank, OurNodeRanksForAllCategories, NodeDisplayInfo } from '@/lib/types';
import { getBigQueryClient, ensureBigQueryClientInitialized, projectId, datasetId } from './bigqueryClient';
import { formatDateFromBQ, getPeriodDateRange, logBigQueryError } from '@/lib/bigqueryUtils';
import { format, subDays, subMonths, subWeeks, startOfDay, endOfDay } from 'date-fns'; // Added subWeeks

async function fetchTopNodesForCategory(primaryCategory: 'micro' | 'common' | 'macro', limit: number = 3): Promise<SingleCategoryTopNode[]> {
  await ensureBigQueryClientInitialized();
  const bigquery = getBigQueryClient();

  if (!bigquery) {
    logBigQueryError(`fetchTopNodesForCategory (${primaryCategory})`, new Error("BigQuery client not available."));
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
    logBigQueryError(`fetchTopNodesForCategory (${primaryCategory}) - Step 1: Identifying top nodes`, error);
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
    logBigQueryError(`fetchTopNodesForCategory (${primaryCategory}) - Step 2: Fetching all stats`, error);
  }
  
  const results: SingleCategoryTopNode[] = topNodesPrimaryData.map(primaryNode => {
    const allStats = allStatsRows.find(s => s.nodeid === primaryNode.nodeid);
    
    let categoryShare: number | null = null;
    let categoryRank: number | null = null;

    if (allStats) {
        switch (primaryCategory) {
            case 'micro':
                categoryShare = allStats.micro_share !== null ? Number(allStats.micro_share) : null;
                categoryRank = allStats.micro_rank !== null ? Number(allStats.micro_rank) : null;
                break;
            case 'common':
                categoryShare = allStats.common_share !== null ? Number(allStats.common_share) : null;
                categoryRank = allStats.common_rank !== null ? Number(allStats.common_rank) : null;
                break;
            case 'macro':
                categoryShare = allStats.macro_share !== null ? Number(allStats.macro_share) : null;
                categoryRank = allStats.macro_rank !== null ? Number(allStats.macro_rank) : null;
                break;
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
    if (bShare !== aShare) {
      return bShare - aShare; 
    }
    const aRank = a.categoryRank ?? Infinity;
    const bRank = b.categoryRank ?? Infinity;
    return aRank - bRank; 
  });

  return results;
}


export async function fetchTopNodesBySubsumption(limit: number = 3): Promise<AllTopNodes> {
  await ensureBigQueryClientInitialized();
  const bigquery = getBigQueryClient(); 
  if (!bigquery) {
    logBigQueryError("fetchTopNodesBySubsumption", new Error("BigQuery client not available."));
    return { micro: [], common: [], macro: [] };
  }
  try {
    const [microNodes, commonNodes, macroNodes] = await Promise.all([
      fetchTopNodesForCategory('micro', limit),
      fetchTopNodesForCategory('common', limit),
      fetchTopNodesForCategory('macro', limit),
    ]);
    return {
      micro: microNodes,
      common: commonNodes,
      macro: macroNodes,
    };
  } catch (error) {
    logBigQueryError("fetchTopNodesBySubsumption (combined)", error);
    return { micro: [], common: [], macro: [] };
  }
}


export async function fetchNetworkSubsumptionDataForNode(nodeId: string, aggregationPeriod: string): Promise<NetworkSubsumptionData[]> {
  await ensureBigQueryClientInitialized();
  const bigquery = getBigQueryClient();

  if (!bigquery) {
    logBigQueryError("fetchNetworkSubsumptionDataForNode", new Error("BigQuery client not available."));
    return [];
  }

  let datePeriodUnit: string;
  let queryStartDate: string;
  const now = new Date();
  const effectiveEndDate = endOfDay(subDays(now, 1));
  const queryEndDate = format(effectiveEndDate, "yyyy-MM-dd'T'HH:mm:ssXXX");

  switch (aggregationPeriod.toLowerCase()) {
    case 'day': // Last 7 days
      datePeriodUnit = 'DAY';
      queryStartDate = format(startOfDay(subDays(effectiveEndDate, 6)), "yyyy-MM-dd'T'HH:mm:ssXXX");
      break;
    case 'week': // Last 4 weeks
      datePeriodUnit = 'WEEK(MONDAY)';
      queryStartDate = format(startOfDay(subDays(effectiveEndDate, (4 * 7) - 1)), "yyyy-MM-dd'T'HH:mm:ssXXX");
      break;
    case 'month': // Last 3 months
      datePeriodUnit = 'MONTH';
      queryStartDate = format(startOfDay(subMonths(effectiveEndDate, 3 - 1)), "yyyy-MM-dd'T'HH:mm:ssXXX");
      break;
    case 'quarter': // Last 12 months
      datePeriodUnit = 'QUARTER';
      queryStartDate = format(startOfDay(subMonths(effectiveEndDate, 12 - 1)), "yyyy-MM-dd'T'HH:mm:ssXXX");
      break;
    default:
      datePeriodUnit = 'DAY';
      queryStartDate = format(startOfDay(subDays(effectiveEndDate, 6)), "yyyy-MM-dd'T'HH:mm:ssXXX");
      break;
  }

  const query = `
    SELECT
      DATE_TRUNC(DATE(timestamp), ${datePeriodUnit}) AS date_group,
      MAX(IF(type = 'micro', shortest_path_share, NULL)) as micro_share,
      MAX(IF(type = 'common', shortest_path_share, NULL)) as common_share,
      MAX(IF(type = 'macro', shortest_path_share, NULL)) as macro_share
    FROM \`${projectId}.${datasetId}.betweenness\`
    WHERE nodeid = @nodeIdToQuery
      AND timestamp >= TIMESTAMP(@startDate)
      AND timestamp <= TIMESTAMP(@endDate)
    GROUP BY date_group
    ORDER BY date_group ASC
  `;

  const options = {
    query: query,
    params: {
      nodeIdToQuery: nodeId,
      startDate: queryStartDate,
      endDate: queryEndDate,
    }
  };

  try {
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    if (!rows || rows.length === 0) {
      return [];
    }

    return rows.map(row => ({
      date: formatDateFromBQ(row.date_group),
      micro: row.micro_share !== null ? parseFloat((Number(row.micro_share) * 100).toFixed(2)) : 0,
      common: row.common_share !== null ? parseFloat((Number(row.common_share) * 100).toFixed(2)) : 0,
      macro: row.macro_share !== null ? parseFloat((Number(row.macro_share) * 100).toFixed(2)) : 0,
    }));
  } catch (error) {
    logBigQueryError(`fetchNetworkSubsumptionDataForNode (nodeId: ${nodeId}, period: ${aggregationPeriod})`, error);
    return [];
  }
}

export async function fetchNodeRankForCategories(nodeIdToFetch: string, aggregationPeriod: string): Promise<OurNodeRanksForAllCategories> {
  await ensureBigQueryClientInitialized();
  const bigquery = getBigQueryClient();
  
  const defaultCategoryRank: OurNodeCategoryRank = { latestRank: null, rankChange: null };
  const result: OurNodeRanksForAllCategories = {
    micro: { ...defaultCategoryRank },
    common: { ...defaultCategoryRank },
    macro: { ...defaultCategoryRank },
  };

  if (!bigquery) {
    logBigQueryError("fetchNodeRankForCategories", new Error("BigQuery client not available."));
    return result;
  }

  const { startDate: periodStartDateString } = getPeriodDateRange(aggregationPeriod);

  const categories: Array<'micro' | 'common' | 'macro'> = ['micro', 'common', 'macro'];

  for (const category of categories) {
    const latestRankQuery = `
      SELECT rank
      FROM \`${projectId}.${datasetId}.betweenness\`
      WHERE nodeid = @nodeIdToQuery AND type = @categoryType
      ORDER BY timestamp DESC
      LIMIT 1
    `;

    const previousRankQuery = `
      SELECT rank
      FROM \`${projectId}.${datasetId}.betweenness\`
      WHERE nodeid = @nodeIdToQuery AND type = @categoryType AND timestamp < TIMESTAMP(@periodStartDate)
      ORDER BY timestamp DESC
      LIMIT 1
    `;

    try {
      const [latestRankJob] = await bigquery.createQueryJob({
        query: latestRankQuery,
        params: { nodeIdToQuery: nodeIdToFetch, categoryType: category }
      });
      const [[latestRankResult]] = await latestRankJob.getQueryResults();
      const latestRank = latestRankResult?.rank !== undefined && latestRankResult?.rank !== null ? Number(latestRankResult.rank) : null;

      result[category].latestRank = latestRank;

      const [previousRankJob] = await bigquery.createQueryJob({
        query: previousRankQuery,
        params: { nodeIdToQuery: nodeIdToFetch, categoryType: category, periodStartDate: periodStartDateString }
      });
      const [[previousRankResult]] = await previousRankJob.getQueryResults();
      const previousRank = previousRankResult?.rank !== undefined && previousRankResult?.rank !== null ? Number(previousRankResult.rank) : null;

      if (latestRank !== null && previousRank !== null) {
        result[category].rankChange = latestRank - previousRank;
      }

    } catch (error) {
      logBigQueryError(`fetchNodeRankForCategories (nodeId: ${nodeIdToFetch}, category: ${category}, period: ${aggregationPeriod})`, error);
    }
  }
  return result;
}

export async function fetchNodeDisplayInfo(nodeId: string): Promise<NodeDisplayInfo | null> {
  await ensureBigQueryClientInitialized();
  const bigquery = getBigQueryClient();

  if (!bigquery || !nodeId) {
    logBigQueryError("fetchNodeDisplayInfo", new Error("BigQuery client not available or nodeId not provided."));
    return null;
  }

  const query = `
    SELECT alias
    FROM \`${projectId}.${datasetId}.betweenness\`
    WHERE nodeid = @nodeIdToQuery
      AND alias IS NOT NULL AND TRIM(alias) != ''
    ORDER BY timestamp DESC
    LIMIT 1
  `;
  const options = {
    query: query,
    params: { nodeIdToQuery: nodeId }
  };

  try {
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    if (rows && rows.length > 0 && rows[0] && rows[0].alias) {
      return {
        nodeId: nodeId,
        alias: String(rows[0].alias),
      };
    }
    return { nodeId: nodeId, alias: null }; 
  } catch (error) {
    logBigQueryError(`fetchNodeDisplayInfo (nodeId: ${nodeId})`, error);
    return { nodeId: nodeId, alias: null }; 
  }
}

export async function fetchNodeIdByAlias(alias: string): Promise<string | null> {
  await ensureBigQueryClientInitialized();
  const bigquery = getBigQueryClient();

  if (!bigquery || !alias || alias.trim() === '') {
    logBigQueryError("fetchNodeIdByAlias", new Error("BigQuery client not available or alias not provided."));
    return null;
  }

  const query = `
    SELECT nodeid
    FROM \`${projectId}.${datasetId}.betweenness\`
    WHERE alias = @aliasToQuery
    ORDER BY timestamp DESC
    LIMIT 1
  `;
  const options = {
    query: query,
    params: { aliasToQuery: alias.trim() }
  };

  try {
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    if (rows && rows.length > 0 && rows[0] && rows[0].nodeid) {
      return String(rows[0].nodeid);
    }
    return null; 
  } catch (error) {
    logBigQueryError(`fetchNodeIdByAlias (alias: ${alias})`, error);
    return null;
  }
}
