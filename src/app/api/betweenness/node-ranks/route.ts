
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getBigQueryClient, ensureBigQueryClientInitialized, projectId, datasetId } from '@/services/bigqueryClient';
import { getPeriodDateRange, logBigQueryError } from '@/lib/bigqueryUtils';
import type { OurNodeRanksForAllCategories, OurNodeCategoryRank } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const nodeId = searchParams.get('nodeId');
    const aggregationPeriod = searchParams.get('aggregation') || 'week';

    if (!nodeId) {
      return NextResponse.json({ error: 'nodeId parameter is required' }, { status: 400 });
    }
    
    await ensureBigQueryClientInitialized();
    const bigquery = getBigQueryClient();

    const defaultCategoryData: OurNodeCategoryRank = { 
      latestRank: null, rankChange: null, 
      latestShare: null, previousShare: null 
    };
    const result: OurNodeRanksForAllCategories = {
      micro: { ...defaultCategoryData },
      common: { ...defaultCategoryData },
      macro: { ...defaultCategoryData },
    };

    if (!bigquery) {
      logBigQueryError("API /api/betweenness/node-ranks", new Error("BigQuery client not available."));
      return NextResponse.json(result); // Return default structure if BQ client fails
    }

    const { startDate: periodStartDateString } = getPeriodDateRange(aggregationPeriod);
    const categories: Array<'micro' | 'common' | 'macro'> = ['micro', 'common', 'macro'];

    for (const category of categories) {
      const latestDataQuery = `
        SELECT rank, shortest_path_share
        FROM \`${projectId}.${datasetId}.betweenness\`
        WHERE nodeid = @nodeIdToQuery AND type = @categoryType
        ORDER BY timestamp DESC
        LIMIT 1
      `;
      const previousDataQuery = `
        SELECT rank, shortest_path_share
        FROM \`${projectId}.${datasetId}.betweenness\`
        WHERE nodeid = @nodeIdToQuery AND type = @categoryType AND timestamp < TIMESTAMP(@periodStartDate)
        ORDER BY timestamp DESC
        LIMIT 1
      `;

      try {
        const [latestDataJob] = await bigquery.createQueryJob({
          query: latestDataQuery,
          params: { nodeIdToQuery: nodeId, categoryType: category }
        });
        const [[latestDataResult]] = await latestDataJob.getQueryResults();
        
        const latestRank = latestDataResult?.rank !== undefined && latestDataResult?.rank !== null ? Number(latestDataResult.rank) : null;
        const latestShare = latestDataResult?.shortest_path_share !== undefined && latestDataResult?.shortest_path_share !== null ? Number(latestDataResult.shortest_path_share) : null;
        
        result[category].latestRank = latestRank;
        result[category].latestShare = latestShare;

        const [previousDataJob] = await bigquery.createQueryJob({
          query: previousDataQuery,
          params: { nodeIdToQuery: nodeId, categoryType: category, periodStartDate: periodStartDateString }
        });
        const [[previousDataResult]] = await previousDataJob.getQueryResults();

        const previousRank = previousDataResult?.rank !== undefined && previousDataResult?.rank !== null ? Number(previousDataResult.rank) : null;
        const previousShare = previousDataResult?.shortest_path_share !== undefined && previousDataResult?.shortest_path_share !== null ? Number(previousDataResult.shortest_path_share) : null;

        result[category].previousShare = previousShare;

        if (latestRank !== null && previousRank !== null) {
          result[category].rankChange = latestRank - previousRank;
        }
      } catch (catError: any) {
        logBigQueryError(`API /api/betweenness/node-ranks for category ${category}`, catError);
        // Continue to next category, result for this one will remain default
      }
    }
    return NextResponse.json(result);

  } catch (error: any) {
    logBigQueryError('API /api/betweenness/node-ranks', error);
    // Construct default result structure on error
    const defaultErrorResult: OurNodeRanksForAllCategories = {
      micro: { latestRank: null, rankChange: null, latestShare: null, previousShare: null },
      common: { latestRank: null, rankChange: null, latestShare: null, previousShare: null },
      macro: { latestRank: null, rankChange: null, latestShare: null, previousShare: null },
    };
    return NextResponse.json(defaultErrorResult, { status: 500 });
  }
}
