
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getBigQueryClient, ensureBigQueryClientInitialized, projectId, datasetId } from '@/services/bigqueryClient';
import { logBigQueryError } from '@/lib/bigqueryUtils';
import { specificNodeId } from '@/lib/constants';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const idsParam = searchParams.get('shortChannelIds');

    if (!idsParam) {
      return NextResponse.json({ error: 'shortChannelIds parameter is required' }, { status: 400 });
    }
    const shortChannelIds = idsParam.split(',').map(id => id.trim()).filter(Boolean);
    if (shortChannelIds.length === 0) {
      return NextResponse.json({});
    }

    await ensureBigQueryClientInitialized();
    const bigquery = getBigQueryClient();
    if (!bigquery) {
      logBigQueryError("API /api/betweenness/channel-drain", new Error("BigQuery client not available."));
      return NextResponse.json({ error: 'Database client not available' }, { status: 500 });
    }

    const query = `
      WITH EdgeData AS (
        SELECT
          short_channel_id,
          MAX(IF(source = @ourNodeId, shortest_path_share, 0)) AS out_share,
          MAX(IF(destination = @ourNodeId, shortest_path_share, 0)) AS in_share
        FROM \`${projectId}.${datasetId}.edge_betweenness\`
        WHERE short_channel_id IN UNNEST(@shortChannelIds)
          AND (source = @ourNodeId OR destination = @ourNodeId)
          AND type = 'common'
        GROUP BY short_channel_id
      )
      SELECT
        short_channel_id,
        in_share,
        out_share
      FROM EdgeData
    `;

    const [job] = await bigquery.createQueryJob({
      query: query,
      params: { ourNodeId: specificNodeId, shortChannelIds: shortChannelIds },
      types: { shortChannelIds: ['STRING'] }
    });
    const [rows] = await job.getQueryResults();

    const result: Record<string, { in_share: number; out_share: number; drain: number | null }> = {};

    rows.forEach((row: any) => {
      const inShareExists = row.in_share !== null && row.in_share !== undefined;
      const outShareExists = row.out_share !== null && row.out_share !== undefined;

      if (!inShareExists && !outShareExists) {
        result[row.short_channel_id] = {
          in_share: 0,
          out_share: 0,
          drain: null, // Both missing, drain is N/A
        };
      } else {
        const inShare = Number(row.in_share || 0);
        const outShare = Number(row.out_share || 0);
        const difference = outShare - inShare;
        const drain = Math.cbrt(difference);

        result[row.short_channel_id] = {
          in_share: inShare,
          out_share: outShare,
          drain: drain,
        };
      }
    });

    return NextResponse.json(result);

  } catch (error: any) {
    logBigQueryError('API /api/betweenness/channel-drain', error);
    return NextResponse.json({ error: 'Failed to fetch channel drain data', details: error.message }, { status: 500 });
  }
}
