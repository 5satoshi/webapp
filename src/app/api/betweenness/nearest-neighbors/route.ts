
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getBigQueryClient, ensureBigQueryClientInitialized, projectId, datasetId } from '@/services/bigqueryClient';
import { logBigQueryError } from '@/lib/bigqueryUtils';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const nodeId = searchParams.get('nodeId');
    const limitParam = searchParams.get('limit');
    
    let limit = 10; // Default limit
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 100) {
        limit = parsedLimit;
      }
    }

    if (!nodeId) {
      return NextResponse.json({ error: 'nodeId parameter is required' }, { status: 400 });
    }

    await ensureBigQueryClientInitialized();
    const bigquery = getBigQueryClient();

    if (!bigquery) {
      logBigQueryError("API /api/betweenness/nearest-neighbors", new Error("BigQuery client not available."));
      return NextResponse.json({ error: 'Database client not available' }, { status: 500 });
    }

    const query = `
      WITH NeighborEdges AS (
        SELECT
            IF(source = @nodeId, destination, source) AS neighbor_id,
            shortest_path_share
        FROM \`${projectId}.${datasetId}.edge_betweenness\`
        WHERE (source = @nodeId OR destination = @nodeId) AND type = 'common'
        ORDER BY shortest_path_share DESC
        LIMIT @limit
      ),
      LatestAliases AS (
          SELECT
              nodeid,
              alias,
              ROW_NUMBER() OVER(PARTITION BY nodeid ORDER BY timestamp DESC) as rn
          FROM \`${projectId}.${datasetId}.betweenness\`
          WHERE nodeid IN (SELECT neighbor_id FROM NeighborEdges)
            AND alias IS NOT NULL AND TRIM(alias) != ''
      )
      SELECT
          ne.neighbor_id,
          ne.shortest_path_share,
          la.alias
      FROM NeighborEdges ne
      LEFT JOIN LatestAliases la ON ne.neighbor_id = la.nodeid AND la.rn = 1
      ORDER BY ne.shortest_path_share DESC
    `;

    const options = {
      query,
      params: {
        nodeId,
        limit,
      },
    };

    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    const result = rows.map((row: any) => ({
      nodeId: row.neighbor_id,
      alias: row.alias || null,
      share: row.shortest_path_share
    }));

    return NextResponse.json(result);

  } catch (error: any) {
    logBigQueryError('API /api/betweenness/nearest-neighbors', error);
    return NextResponse.json({ error: 'Failed to fetch nearest neighbors', details: error.message }, { status: 500 });
  }
}
