
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getBigQueryClient, ensureBigQueryClientInitialized, projectId, datasetId } from '@/services/bigqueryClient';
import { formatDateFromBQ, getPeriodDateRange, logBigQueryError } from '@/lib/bigqueryUtils';
import type { NetworkSubsumptionData } from '@/lib/types';
import { format, subDays, subMonths, startOfDay, endOfDay } from 'date-fns';

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

    if (!bigquery) {
      logBigQueryError("API /api/betweenness/node-timeline", new Error("BigQuery client not available."));
      return NextResponse.json({ error: 'Database client not available' }, { status: 500 });
    }

    let datePeriodUnit: string;
    let queryStartDate: string;
    const now = new Date();
    const effectiveEndDate = endOfDay(subDays(now, 1));
    const queryEndDate = format(effectiveEndDate, "yyyy-MM-dd'T'HH:mm:ssXXX");

    switch (aggregationPeriod.toLowerCase()) {
      case 'day': 
        datePeriodUnit = 'DAY';
        queryStartDate = format(startOfDay(subDays(effectiveEndDate, 6)), "yyyy-MM-dd'T'HH:mm:ssXXX");
        break;
      case 'week': 
        datePeriodUnit = 'WEEK(MONDAY)';
        queryStartDate = format(startOfDay(subDays(effectiveEndDate, (4 * 7) - 1)), "yyyy-MM-dd'T'HH:mm:ssXXX");
        break;
      case 'month': 
        datePeriodUnit = 'MONTH';
        queryStartDate = format(startOfDay(subMonths(effectiveEndDate, 3 - 1)), "yyyy-MM-dd'T'HH:mm:ssXXX");
        break;
      case 'quarter': 
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

    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    if (!rows) { // Check if rows is null or undefined
        return NextResponse.json([]);
    }
    
    const responseData: NetworkSubsumptionData[] = rows.map(row => ({
      date: formatDateFromBQ(row.date_group),
      micro: row.micro_share !== null ? parseFloat((Number(row.micro_share) * 100).toFixed(2)) : 0,
      common: row.common_share !== null ? parseFloat((Number(row.common_share) * 100).toFixed(2)) : 0,
      macro: row.macro_share !== null ? parseFloat((Number(row.macro_share) * 100).toFixed(2)) : 0,
    }));

    return NextResponse.json(responseData);

  } catch (error: any) {
    logBigQueryError('API /api/betweenness/node-timeline', error);
    return NextResponse.json({ error: 'Failed to fetch node timeline data', details: error.message }, { status: 500 });
  }
}
