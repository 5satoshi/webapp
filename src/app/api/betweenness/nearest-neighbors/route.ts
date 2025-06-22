
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getBigQueryClient, ensureBigQueryClientInitialized, projectId, datasetId } from '@/services/bigqueryClient';
import { logBigQueryError } from '@/lib/bigqueryUtils';

export async function GET(request: NextRequest) {
  try {
    // 1. Get and validate parameters
    const searchParams = request.nextUrl.searchParams;
    const nodeIdsParam = searchParams.get('nodeIds');
    const limitParam = searchParams.get('limit');

    let limit = 10;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 100) {
        limit = parsedLimit;
      }
    }
    
    if (!nodeIdsParam) {
      return NextResponse.json({ error: 'nodeIds parameter is required' }, { status: 400 });
    }
    const nodeIds = nodeIdsParam.split(',').map(id => id.trim()).filter(Boolean);
    if (nodeIds.length === 0) {
        return NextResponse.json([]); // Return empty array if no valid node IDs
    }

    // 2. Initialize BigQuery client
    await ensureBigQueryClientInitialized();
    const bigquery = getBigQueryClient();
    if (!bigquery) {
      logBigQueryError("API /api/betweenness/nearest-neighbors", new Error("BigQuery client not available."));
      return NextResponse.json({ error: 'Database client not available' }, { status: 500 });
    }
    
    // 3. This query finds the top 'limit' neighbors for EACH node in the input list,
    // ensuring we don't include edges between two nodes from the input list.
    const query = `
      WITH EdgesFromSource AS (
        SELECT
          -- The neighbor is the node in the edge pair that is NOT from our input list
          IF(source IN UNNEST(@nodeIdList), destination, source) AS neighbor_id,
          shortest_path_share,
          -- This is the node from our input list that this neighbor is connected to. We partition by this.
          IF(source IN UNNEST(@nodeIdList), source, destination) as source_node,
          ROW_NUMBER() OVER(
              PARTITION BY IF(source IN UNNEST(@nodeIdList), source, destination)
              ORDER BY shortest_path_share DESC
          ) as rn
        FROM \`${projectId}.${datasetId}.edge_betweenness\`
        WHERE 
          (source IN UNNEST(@nodeIdList) OR destination IN UNNEST(@nodeIdList))
          AND type = 'common'
          -- Exclude edges that are between two nodes from our input list
          AND NOT (source IN UNNEST(@nodeIdList) AND destination IN UNNEST(@nodeIdList))
      ),
      AggregatedNeighbors AS (
        -- We group by neighbor_id because a single neighbor might be connected to multiple source nodes.
        -- We take the highest share value it has among those connections.
        SELECT
          neighbor_id,
          MAX(shortest_path_share) as share
        FROM EdgesFromSource
        WHERE rn <= @limit
        GROUP BY neighbor_id
      )
      SELECT * FROM AggregatedNeighbors
    `;
    
    const [job] = await bigquery.createQueryJob({
        query: query,
        params: { nodeIdList: nodeIds, limit: limit },
        types: { nodeIdList: ['STRING'] }
    });
    const [rows] = await job.getQueryResults();

    const result = rows.map((row: any) => ({
        nodeId: row.neighbor_id,
        share: row.share
    }));

    return NextResponse.json(result);

  } catch (error: any) {
    logBigQueryError('API /api/betweenness/nearest-neighbors', error);
    return NextResponse.json({ error: 'Failed to fetch nearest neighbors', details: error.message }, { status: 500 });
  }
}
