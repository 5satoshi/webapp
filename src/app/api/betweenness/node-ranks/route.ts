
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

    const defaultCategoryRank: OurNodeCategoryRank = { latestRank: null, rankChange: null };
    const result: OurNodeRanksForAllCategories = {
      micro: { ...defaultCategoryRank },
      common: { ...defaultCategoryRank },
      macro: { ...defaultCategoryRank },
    };

    if (!bigquery) {
      logBigQueryError("API /api/betweenness/node-ranks", new Error("BigQuery client not available."));
      return NextResponse.json(result); // Return default structure if BQ client fails
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
          params: { nodeIdToQuery: nodeId, categoryType: category }
        });
        const [[latestRankResult]] = await latestRankJob.getQueryResults();
        const latestRank = latestRankResult?.rank !== undefined && latestRankResult?.rank !== null ? Number(latestRankResult.rank) : null;
        result[category].latestRank = latestRank;

        const [previousRankJob] = await bigquery.createQueryJob({
          query: previousRankQuery,
          params: { nodeIdToQuery: nodeId, categoryType: category, periodStartDate: periodStartDateString }
        });
        const [[previousRankResult]] = await previousRankJob.getQueryResults();
        const previousRank = previousRankResult?.rank !== undefined && previousRankResult?.rank !== null ? Number(previousRankResult.rank) : null;

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
    return NextResponse.json({ error: 'Failed to fetch node rank data', details: error.message }, { status: 500 });
  }
}
