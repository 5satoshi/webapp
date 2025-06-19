
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getBigQueryClient, ensureBigQueryClientInitialized, projectId, datasetId } from '@/services/bigqueryClient';
import { logBigQueryError } from '@/lib/bigqueryUtils';
import type { NodeGraphData, GraphNode, GraphLink } from '@/lib/types';

export async function GET(request: NextRequest) {
  console.log('[API /api/betweenness/node-graph] GET request received.');
  try {
    const searchParams = request.nextUrl.searchParams;
    const centralNodeId = searchParams.get('nodeId');
    console.log(`[API /api/betweenness/node-graph] Central Node ID from params: ${centralNodeId}`);

    if (!centralNodeId) {
      console.error('[API /api/betweenness/node-graph] Error: nodeId parameter is required.');
      return NextResponse.json({ error: 'nodeId parameter is required' }, { status: 400 });
    }

    console.log('[API /api/betweenness/node-graph] Ensuring BigQuery client is initialized...');
    await ensureBigQueryClientInitialized();
    const bigquery = getBigQueryClient();

    if (!bigquery) {
      const errorMessage = "BigQuery client not available after ensuring initialization.";
      logBigQueryError("API /api/betweenness/node-graph", new Error(errorMessage));
      console.error(`[API /api/betweenness/node-graph] ${errorMessage}`);
      return NextResponse.json({ error: 'Database client not available' }, { status: 500 });
    }
    console.log('[API /api/betweenness/node-graph] BigQuery client obtained.');

    // Query for 1st-degree edges involving the central node
    const firstDegreeEdgeQuery = `
      SELECT
        source,
        destination,
        shortest_path_share
      FROM \`${projectId}.${datasetId}.edge_betweenness\`
      WHERE (source = @centralNodeId OR destination = @centralNodeId)
        AND type = 'common' 
        AND shortest_path_share >= 0.001
    `;
    const firstDegreeEdgeOptions = {
      query: firstDegreeEdgeQuery,
      params: { centralNodeId: centralNodeId }
    };
    console.log(`[API /api/betweenness/node-graph] Executing 1st-degree edge query for node: ${centralNodeId}`);
    const [firstDegreeJob] = await bigquery.createQueryJob(firstDegreeEdgeOptions);
    const [firstDegreeEdgeRows] = await firstDegreeJob.getQueryResults();
    console.log(`[API /api/betweenness/node-graph] 1st-degree edge query returned ${firstDegreeEdgeRows.length} rows.`);

    const firstDegreeNeighborIds = new Set<string>();
    firstDegreeEdgeRows.forEach((row: any) => {
      if (row.source !== centralNodeId) firstDegreeNeighborIds.add(String(row.source));
      if (row.destination !== centralNodeId) firstDegreeNeighborIds.add(String(row.destination));
    });

    let allEdgeRows = [...firstDegreeEdgeRows];
    let secondDegreeEdgeRows: any[] = [];

    if (firstDegreeNeighborIds.size > 0) {
      const neighborIdsArray = Array.from(firstDegreeNeighborIds);
      const secondDegreeEdgeQuery = `
        SELECT
          source,
          destination,
          shortest_path_share
        FROM \`${projectId}.${datasetId}.edge_betweenness\`
        WHERE (source IN UNNEST(@neighborIdsArray) OR destination IN UNNEST(@neighborIdsArray))
          AND type = 'common'
          AND shortest_path_share >= 0.001
          -- Exclude edges that are only to the central node (already covered by 1st degree)
          AND source != @centralNodeId AND destination != @centralNodeId
      `;
      // This query will include edges *between* 1st-degree neighbors if they meet the criteria,
      // and edges from 1st-degree neighbors to new (2nd-degree) neighbors.

      const secondDegreeEdgeOptions = {
        query: secondDegreeEdgeQuery,
        params: { neighborIdsArray: neighborIdsArray, centralNodeId: centralNodeId }
      };
      console.log(`[API /api/betweenness/node-graph] Executing 2nd-degree edge query for ${neighborIdsArray.length} neighbors.`);
      const [secondDegreeJob] = await bigquery.createQueryJob(secondDegreeEdgeOptions);
      [secondDegreeEdgeRows] = await secondDegreeJob.getQueryResults();
      console.log(`[API /api/betweenness/node-graph] 2nd-degree edge query returned ${secondDegreeEdgeRows.length} rows.`);
      allEdgeRows = allEdgeRows.concat(secondDegreeEdgeRows);
    }
    
    const nodesMap = new Map<string, GraphNode>();
    const links: GraphLink[] = [];
    const allNodeIdsInGraph = new Set<string>();
    allNodeIdsInGraph.add(centralNodeId); // Ensure central node is always in the graph

    allEdgeRows.forEach((row: any) => {
      const sourceId = String(row.source);
      const targetId = String(row.destination);
      const share = parseFloat(row.shortest_path_share);

      allNodeIdsInGraph.add(sourceId);
      allNodeIdsInGraph.add(targetId);
      
      links.push({ source: sourceId, target: targetId, value: share });
    });

    // Populate nodesMap with initial structure and determine degree
    allNodeIdsInGraph.forEach(nodeId => {
      let val: number;
      let color: string;
      let namePrefix = "";
      let nodeIsCentral = false;

      if (nodeId === centralNodeId) {
        val = 10;
        color = 'hsl(var(--primary))'; // Purple
        namePrefix = "Central: ";
        nodeIsCentral = true;
      } else if (firstDegreeNeighborIds.has(nodeId)) {
        val = 7;
        color = 'hsl(var(--secondary))'; // Orange
        namePrefix = "1st: ";
      } else {
        val = 5; // 2nd degree
        color = 'hsl(var(--accent))'; // Electric Purple / Lighter Purple
        namePrefix = "2nd: ";
      }

      nodesMap.set(nodeId, {
        id: nodeId,
        name: `${namePrefix}${nodeId.substring(0, 8)}...`, // Initial placeholder name
        val: val,
        isCentralNode: nodeIsCentral,
        color: color
      });
    });

    // Fetch aliases for all collected node IDs from the 'nodes' table
    const nodeIdsForAliasLookup = Array.from(allNodeIdsInGraph);
    if (nodeIdsForAliasLookup.length > 0) {
      const aliasQuery = `
        SELECT nodeid, alias
        FROM \`${projectId}.${datasetId}.nodes\`
        WHERE nodeid IN UNNEST(@nodeIds)
      `;
      const aliasOptions = {
        query: aliasQuery,
        params: { nodeIds: nodeIdsForAliasLookup }
      };
      console.log(`[API /api/betweenness/node-graph] Executing alias query for ${nodeIdsForAliasLookup.length} nodes.`);
      const [aliasJob] = await bigquery.createQueryJob(aliasOptions);
      const [aliasRows] = await aliasJob.getQueryResults();
      console.log(`[API /api/betweenness/node-graph] Alias query returned ${aliasRows.length} rows.`);

      aliasRows.forEach((row: any) => {
        const nodeId = String(row.nodeid);
        const alias = row.alias ? String(row.alias).trim() : null;
        const graphNode = nodesMap.get(nodeId);
        if (graphNode && alias && alias !== "") {
            // Keep existing prefix from degree determination
            const currentPrefix = graphNode.name.substring(0, graphNode.name.indexOf(':') + 2);
            graphNode.name = `${currentPrefix}${alias}`;
        }
      });
    }
    
    // Fallback: If central node alias was not in 'nodes' table, try 'betweenness' table (only for central node)
    const centralGraphNode = nodesMap.get(centralNodeId);
    if (centralGraphNode && centralGraphNode.name.startsWith(`Central: ${centralNodeId.substring(0, 8)}...`)) {
      const centralAliasQueryBetweenness = `
        SELECT alias FROM \`${projectId}.${datasetId}.betweenness\`
        WHERE nodeid = @centralNodeId AND alias IS NOT NULL AND TRIM(alias) != ''
        ORDER BY timestamp DESC
        LIMIT 1
      `;
      console.log(`[API /api/betweenness/node-graph] Central node alias not in 'nodes'. Querying 'betweenness'.`);
      const [centralAliasJobB] = await bigquery.createQueryJob({query: centralAliasQueryBetweenness, params: {centralNodeId}});
      const [centralAliasRowsB] = await centralAliasJobB.getQueryResults();
      if (centralAliasRowsB.length > 0 && centralAliasRowsB[0].alias) {
        centralGraphNode.name = `Central: ${String(centralAliasRowsB[0].alias)}`;
        console.log(`[API /api/betweenness/node-graph] Found central node alias in 'betweenness': ${centralGraphNode.name}`);
      } else {
         console.log(`[API /api/betweenness/node-graph] Central node alias not in 'betweenness' either.`);
      }
    }

    const finalNodes = Array.from(nodesMap.values());
    // Deduplicate links: A-B is the same as B-A for rendering purposes in an undirected graph sense.
    // Keep the one with higher share or just the first encountered if shares are equal.
    // react-force-graph itself does not automatically deduplicate if link objects are different.
    const linkExistenceMap = new Map<string, GraphLink>();
    links.forEach(link => {
        const key1 = `${link.source}-${link.target}`;
        const key2 = `${link.target}-${link.source}`;
        if (!linkExistenceMap.has(key1) && !linkExistenceMap.has(key2)) {
            linkExistenceMap.set(key1, link);
        } else {
            const existingLink = linkExistenceMap.get(key1) || linkExistenceMap.get(key2);
            if (existingLink && link.value > existingLink.value) { // Prefer link with higher share
                 linkExistenceMap.set(key1, link); // Overwrite if new one is better (or use key1/key2 consistently)
                 if (linkExistenceMap.has(key2)) linkExistenceMap.delete(key2); // remove the other direction if it existed
            }
        }
    });
    const uniqueLinks = Array.from(linkExistenceMap.values());


    const responseData: NodeGraphData = {
      nodes: finalNodes,
      links: uniqueLinks
    };
    console.log(`[API /api/betweenness/node-graph] Successfully prepared graph data. Nodes: ${responseData.nodes.length}, Links: ${responseData.links.length}. Responding with data.`);
    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error(`[API /api/betweenness/node-graph] CRITICAL ERROR in GET handler: ${error.message}`, error);
    logBigQueryError('API /api/betweenness/node-graph', error);
    return NextResponse.json({ error: 'Failed to fetch node graph data', details: error.message }, { status: 500 });
  }
}
// Ensure dynamic rendering for API routes if not default
// export const dynamic = 'force-dynamic'; // Removed to align with other working routes
