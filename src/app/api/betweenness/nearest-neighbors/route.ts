
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
    const degreesParam = searchParams.get('degrees') || '1'; // Default to 1

    let limit = 10; // Default limit
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 100) {
        limit = parsedLimit;
      }
    }

    const degrees = degreesParam.split(',').map(d => parseInt(d.trim(), 10)).filter(n => !isNaN(n) && (n === 1 || n === 2));

    if (!nodeId) {
      return NextResponse.json({ error: 'nodeId parameter is required' }, { status: 400 });
    }
    if (degrees.length === 0) {
        return NextResponse.json({ error: "Invalid 'degrees' parameter. Must be '1', '2', or '1,2'." }, { status: 400 });
    }

    // 2. Initialize BigQuery client
    await ensureBigQueryClientInitialized();
    const bigquery = getBigQueryClient();
    if (!bigquery) {
      logBigQueryError("API /api/betweenness/nearest-neighbors", new Error("BigQuery client not available."));
      return NextResponse.json({ error: 'Database client not available' }, { status: 500 });
    }

    // 3. Data fetching logic
    const processedNodes = new Set<string>([nodeId]);
    const neighborsResult = new Map<string, { nodeId: string; alias: string | null; share: number; degree: number }>();
    let firstDegreeNeighbors: { id: string; share: number }[] = [];

    // Fetch 1st Degree Neighbors if degrees param includes 1 or 2 (since 2nd degree depends on 1st)
    if (degrees.includes(1) || degrees.includes(2)) {
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

      firstDegreeRows.forEach((row: any) => {
        const neighborId = row.neighbor_id;
        if (!processedNodes.has(neighborId)) {
          firstDegreeNeighbors.push({ id: neighborId, share: row.shortest_path_share });
          if (degrees.includes(1)) {
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
    }

    // Fetch 2nd Degree Neighbors
    if (degrees.includes(2) && firstDegreeNeighbors.length > 0) {
      for (const firstDegreeNeighbor of firstDegreeNeighbors) {
        const secondDegreeQuery = `
          SELECT
              IF(source = @firstDegreeNodeId, destination, source) AS neighbor_id,
              shortest_path_share
          FROM \`${projectId}.${datasetId}.edge_betweenness\`
          WHERE 
            ((source = @firstDegreeNodeId AND destination NOT IN UNNEST(@processedNodes)) OR
             (destination = @firstDegreeNodeId AND source NOT IN UNNEST(@processedNodes)))
            AND type = 'common'
          ORDER BY shortest_path_share DESC
          LIMIT @limit
        `;
        const [secondDegreeJob] = await bigquery.createQueryJob({
          query: secondDegreeQuery,
          params: {
            firstDegreeNodeId: firstDegreeNeighbor.id,
            processedNodes: Array.from(processedNodes),
            limit,
          },
          types: {
             processedNodes: ['STRING'] // BQ type for array of strings in params
          }
        });
        const [secondDegreeRows] = await secondDegreeJob.getQueryResults();

        secondDegreeRows.forEach((row: any) => {
          const neighborId = row.neighbor_id;
          // Add to processedNodes immediately to prevent duplicates in subsequent 2nd-degree queries
          if (!processedNodes.has(neighborId)) {
            processedNodes.add(neighborId);
            // Only add to results if not already present (e.g., from another 1st-degree path)
            if (!neighborsResult.has(neighborId)) {
                neighborsResult.set(neighborId, {
                  nodeId: neighborId,
                  alias: null,
                  share: row.shortest_path_share, // This is share relative to the 1st degree node
                  degree: 2,
                });
            }
          }
        });
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
        // Primary sort: by degree (ascending)
        if (a.degree !== b.degree) {
            return a.degree - b.degree;
        }
        // Secondary sort: by share (descending)
        return b.share - a.share;
    });

    return NextResponse.json(finalResult);

  } catch (error: any) {
    logBigQueryError('API /api/betweenness/nearest-neighbors', error);
    return NextResponse.json({ error: 'Failed to fetch nearest neighbors', details: error.message }, { status: 500 });
  }
}
