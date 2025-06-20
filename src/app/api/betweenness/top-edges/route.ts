
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getBigQueryClient, ensureBigQueryClientInitialized, projectId, datasetId } from '@/services/bigqueryClient';
import { logBigQueryError } from '@/lib/bigqueryUtils';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const nodeIdsParam = searchParams.get('nodeIds');
    const limitParam = searchParams.get('limit');

    let limit = 25; // Default limit
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 200) {
        limit = parsedLimit;
      }
    }

    if (!nodeIdsParam) {
      return NextResponse.json({ error: 'nodeIds parameter (comma-separated list) is required' }, { status: 400 });
    }
    const nodeIds = nodeIdsParam.split(',').map(id => id.trim()).filter(id => id);
    if (nodeIds.length === 0) {
      return NextResponse.json({ error: 'nodeIds parameter cannot be empty' }, { status: 400 });
    }

    await ensureBigQueryClientInitialized();
    const bigquery = getBigQueryClient();

    if (!bigquery) {
      logBigQueryError("API /api/betweenness/top-edges", new Error("BigQuery client not available."));
      return NextResponse.json({ error: 'Database client not available' }, { status: 500 });
    }

    const query = `
      SELECT
          source,
          destination,
          shortest_path_share
      FROM \`${projectId}.${datasetId}.edge_betweenness\`
      WHERE source IN UNNEST(@nodeIdList)
        AND destination IN UNNEST(@nodeIdList)
        AND type = 'common'
      ORDER BY shortest_path_share DESC
      LIMIT @limit
    `;

    const options = {
      query,
      params: {
        nodeIdList: nodeIds,
        limit,
      },
    };

    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    const result = rows.map((row: any) => ({
      source: row.source,
      destination: row.destination,
      share: row.shortest_path_share,
    }));

    return NextResponse.json(result);

  } catch (error: any) {
    logBigQueryError('API /api/betweenness/top-edges', error);
    return NextResponse.json({ error: 'Failed to fetch top edges', details: error.message }, { status: 500 });
  }
}
