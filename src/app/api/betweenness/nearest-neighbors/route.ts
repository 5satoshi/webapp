
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getBigQueryClient, ensureBigQueryClientInitialized, projectId, datasetId } from '@/services/bigqueryClient';
import { logBigQueryError } from '@/lib/bigqueryUtils';

export async function GET(request: NextRequest) {
  try {
    // 1. Get and validate parameters
    const searchParams = request.nextUrl.searchParams;
    const nodeId = searchParams.get('nodeId');
    const limitParam = searchParams.get('limit');
    const degreesParam = searchParams.get('degrees') || '1';

    let limit = 10;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 100) {
        limit = parsedLimit;
      }
    }

    const requestedDegrees = degreesParam.split(',').map(d => parseInt(d.trim(), 10)).filter(n => !isNaN(n) && n > 0 && n <= 5);
    const maxDegree = requestedDegrees.length > 0 ? Math.max(...requestedDegrees) : 0;
    
    if (!nodeId) {
      return NextResponse.json({ error: 'nodeId parameter is required' }, { status: 400 });
    }
    if (maxDegree === 0) {
        return NextResponse.json({ error: "Invalid 'degrees' parameter. Must be between 1 and 5." }, { status: 400 });
    }

    // 2. Initialize BigQuery client
    await ensureBigQueryClientInitialized();
    const bigquery = getBigQueryClient();
    if (!bigquery) {
      logBigQueryError("API /api/betweenness/nearest-neighbors", new Error("BigQuery client not available."));
      return NextResponse.json({ error: 'Database client not available' }, { status: 500 });
    }

    // 3. Data fetching logic
    const neighborsResult = new Map<string, { nodeId: string; alias: string | null; share: number; degree: number }>();
    const processedNodes = new Set<string>([nodeId]);
    const nodesByDegree = new Map<number, { id: string; share: number }[]>();

    // --- Degree 1 ---
    const firstDegreeQuery = `
        SELECT
            IF(source = @nodeId, destination, source) AS neighbor_id,
            shortest_path_share
        FROM \`${projectId}.${datasetId}.edge_betweenness\`
        WHERE (source = @nodeId OR destination = @nodeId) AND type = 'common'
        ORDER BY shortest_path_share DESC
        LIMIT @limit
    `;
    const [firstDegreeJob] = await bigquery.createQueryJob({ query: firstDegreeQuery, params: { nodeId, limit } });
    const [firstDegreeRows] = await firstDegreeJob.getQueryResults();

    const firstDegreeNeighbors: { id: string; share: number }[] = [];
    firstDegreeRows.forEach((row: any) => {
        const neighborId = row.neighbor_id;
        if (!processedNodes.has(neighborId)) {
            firstDegreeNeighbors.push({ id: neighborId, share: row.shortest_path_share });
            if (requestedDegrees.includes(1)) {
                neighborsResult.set(neighborId, {
                    nodeId: neighborId,
                    alias: null,
                    share: row.shortest_path_share,
                    degree: 1,
                });
            }
            processedNodes.add(neighborId);
        }
    });
    if (firstDegreeNeighbors.length > 0) {
        nodesByDegree.set(1, firstDegreeNeighbors);
    }

    // --- Degrees > 1 ---
    for (let d = 2; d <= maxDegree; d++) {
        const previousDegreeNodes = nodesByDegree.get(d - 1);
        if (!previousDegreeNodes || previousDegreeNodes.length === 0) {
            break; // No more nodes to explore from
        }

        const previousDegreeNodeIds = previousDegreeNodes.map(n => n.id);

        const nextDegreeQuery = `
            WITH EdgesFromPrevDegree AS (
                SELECT
                    IF(source IN UNNEST(@prevDegreeIds), destination, source) AS neighbor_id,
                    shortest_path_share,
                    IF(source IN UNNEST(@prevDegreeIds), source, destination) AS source_node_from_prev_degree,
                    ROW_NUMBER() OVER(PARTITION BY IF(source IN UNNEST(@prevDegreeIds), source, destination) ORDER BY shortest_path_share DESC) as rn
                FROM \`${projectId}.${datasetId}.edge_betweenness\`
                WHERE (source IN UNNEST(@prevDegreeIds) OR destination IN UNNEST(@prevDegreeIds))
                  AND type = 'common'
                  AND IF(source IN UNNEST(@prevDegreeIds), destination, source) NOT IN UNNEST(@processedNodesArr)
            )
            SELECT neighbor_id, shortest_path_share
            FROM EdgesFromPrevDegree
            WHERE rn <= @limit
        `;
        
        const [nextDegreeJob] = await bigquery.createQueryJob({
            query: nextDegreeQuery,
            params: {
                prevDegreeIds: previousDegreeNodeIds,
                processedNodesArr: Array.from(processedNodes),
                limit
            },
            types: { prevDegreeIds: ['STRING'], processedNodesArr: ['STRING'] }
        });
        const [nextDegreeRows] = await nextDegreeJob.getQueryResults();
        
        const currentDegreeNeighbors: { id: string; share: number }[] = [];
        const newNodesThisDegree = new Set<string>();

        for(const row of nextDegreeRows as any[]) {
            const neighborId = row.neighbor_id;
            if (!processedNodes.has(neighborId) && !newNodesThisDegree.has(neighborId)) {
                newNodesThisDegree.add(neighborId);
                currentDegreeNeighbors.push({ id: neighborId, share: row.shortest_path_share });
                if (requestedDegrees.includes(d) && !neighborsResult.has(neighborId)) {
                    neighborsResult.set(neighborId, {
                        nodeId: neighborId, alias: null, share: row.shortest_path_share, degree: d
                    });
                }
            }
        }
        
        newNodesThisDegree.forEach(id => processedNodes.add(id));

        if (currentDegreeNeighbors.length > 0) {
            nodesByDegree.set(d, currentDegreeNeighbors);
        } else {
            break;
        }
    }

    // Fetch Aliases for all collected neighbors
    const allNeighborIds = Array.from(neighborsResult.keys());
    if (allNeighborIds.length > 0) {
      const aliasQuery = `
          WITH LatestAliases AS (
              SELECT
                  nodeid,
                  alias,
                  ROW_NUMBER() OVER(PARTITION BY nodeid ORDER BY timestamp DESC) as rn
              FROM \`${projectId}.${datasetId}.betweenness\`
              WHERE nodeid IN UNNEST(@allNeighborIds)
                AND alias IS NOT NULL AND TRIM(alias) != ''
          )
          SELECT nodeid, alias FROM LatestAliases WHERE rn = 1
      `;
      const [aliasJob] = await bigquery.createQueryJob({
        query: aliasQuery,
        params: { allNeighborIds },
        types: { allNeighborIds: ['STRING'] }
      });
      const [aliasRows] = await aliasJob.getQueryResults();

      aliasRows.forEach((row: any) => {
        if (neighborsResult.has(row.nodeid)) {
          const neighborData = neighborsResult.get(row.nodeid)!;
          neighborData.alias = row.alias;
        }
      });
    }

    // 4. Format and return response
    const finalResult = Array.from(neighborsResult.values()).sort((a, b) => {
        if (a.degree !== b.degree) {
            return a.degree - b.degree;
        }
        return b.share - a.share;
    });

    return NextResponse.json(finalResult);

  } catch (error: any) {
    logBigQueryError('API /api/betweenness/nearest-neighbors', error);
    return NextResponse.json({ error: 'Failed to fetch nearest neighbors', details: error.message }, { status: 500 });
  }
}
