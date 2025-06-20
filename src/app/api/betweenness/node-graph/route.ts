
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getBigQueryClient, ensureBigQueryClientInitialized, projectId, datasetId } from '@/services/bigqueryClient';
import { logBigQueryError } from '@/lib/bigqueryUtils';
import type { NodeGraphData, GraphNode, GraphLink } from '@/lib/types';

// Colors based on globals.css for direct use in canvas
const PRIMARY_COLOR_HSL = 'hsl(277, 70%, 36%)';   // --primary (Purple)
const SECONDARY_COLOR_HSL = 'hsl(34, 100%, 50%)'; // --secondary (Orange)
const ACCENT_COLOR_HSL = 'hsl(288, 48%, 60%)';    // --accent (Electric Purple)


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

    const selectedNodeIds = new Set<string>([centralNodeId]);
    const nodesMap = new Map<string, GraphNode>();
    
    // --- Step 1: Get top 3 1st-degree neighbors for the central node ---
    const centralNodeEdgesQuery = `
      SELECT
        source,
        destination,
        shortest_path_share
      FROM \`${projectId}.${datasetId}.edge_betweenness\`
      WHERE (source = @nodeId OR destination = @nodeId) AND type = 'common'
      ORDER BY shortest_path_share DESC
      LIMIT 100 -- Fetch more to ensure we can find 3 unique neighbors
    `;
    const centralNodeEdgesOptions = { query: centralNodeEdgesQuery, params: { nodeId: centralNodeId } };
    console.log(`[API /api/betweenness/node-graph] Executing central node edge query for node: ${centralNodeId}`);
    const [centralNodeEdgesJob] = await bigquery.createQueryJob(centralNodeEdgesOptions);
    const [centralNodeEdgeRows] = await centralNodeEdgesJob.getQueryResults();
    console.log(`[API /api/betweenness/node-graph] Central node edge query returned ${centralNodeEdgeRows.length} rows.`);

    const top1stDegreeNeighbors = new Map<string, {id: string, share: number}>();
    for (const row of centralNodeEdgeRows) {
      const neighborId = String(row.source) === centralNodeId ? String(row.destination) : String(row.source);
      if (neighborId !== centralNodeId && top1stDegreeNeighbors.size < 3 && !top1stDegreeNeighbors.has(neighborId)) {
        top1stDegreeNeighbors.set(neighborId, {id: neighborId, share: parseFloat(row.shortest_path_share) });
        selectedNodeIds.add(neighborId);
      }
      if (top1stDegreeNeighbors.size >= 3) break;
    }
    const top1stDegreeNeighborIds = Array.from(top1stDegreeNeighbors.keys());
    console.log(`[API /api/betweenness/node-graph] Top 3 1st-degree neighbors: ${top1stDegreeNeighborIds.join(', ')}`);


    // --- Step 2: For each top 1st-degree neighbor, get their top 3 2nd-degree neighbors ---
    for (const firstDegreeNeighborId of top1stDegreeNeighborIds) {
      const secondDegreeEdgesQuery = `
        SELECT
          source,
          destination,
          shortest_path_share
        FROM \`${projectId}.${datasetId}.edge_betweenness\`
        WHERE (source = @nodeId OR destination = @nodeId) 
          AND type = 'common'
          AND source NOT IN UNNEST(@excludedIds)
          AND destination NOT IN UNNEST(@excludedIds)
        ORDER BY shortest_path_share DESC
        LIMIT 100 -- Fetch more to find 3 unique new neighbors
      `;
      // Exclude central node and the current 1st degree neighbor itself from being selected as 2nd degree
      const excludedIdsFor2ndDegree = [centralNodeId, firstDegreeNeighborId];

      const secondDegreeEdgesOptions = { query: secondDegreeEdgesQuery, params: { nodeId: firstDegreeNeighborId, excludedIds: excludedIdsFor2ndDegree } };
      console.log(`[API /api/betweenness/node-graph] Executing 2nd-degree edge query for 1st-degree neighbor: ${firstDegreeNeighborId}`);
      const [secondDegreeEdgesJob] = await bigquery.createQueryJob(secondDegreeEdgesOptions);
      const [secondDegreeEdgeRows] = await secondDegreeEdgesJob.getQueryResults();
      console.log(`[API /api/betweenness/node-graph] 2nd-degree edge query for ${firstDegreeNeighborId} returned ${secondDegreeEdgeRows.length} rows.`);
      
      let foundSecondDegreeForCurrentNeighbor = 0;
      for (const row of secondDegreeEdgeRows) {
        const potentialSecondDegreeId = String(row.source) === firstDegreeNeighborId ? String(row.destination) : String(row.source);
        // Ensure it's not already a 1st degree neighbor or the central node.
        // selectedNodeIds already contains central and all top 1st degree.
        if (!selectedNodeIds.has(potentialSecondDegreeId) && foundSecondDegreeForCurrentNeighbor < 3) {
             selectedNodeIds.add(potentialSecondDegreeId);
             foundSecondDegreeForCurrentNeighbor++;
        }
        if (foundSecondDegreeForCurrentNeighbor >=3) break;
      }
    }
    console.log(`[API /api/betweenness/node-graph] All selected node IDs (${selectedNodeIds.size}): ${Array.from(selectedNodeIds).join(', ')}`);


    // --- Step 3: Fetch all edges between any two of the selected nodes ---
    const finalSelectedNodeIdsArray = Array.from(selectedNodeIds);
    let allLinks: GraphLink[] = [];
    if (finalSelectedNodeIdsArray.length > 1) {
      const allEdgesQuery = `
        SELECT
          source,
          destination,
          shortest_path_share
        FROM \`${projectId}.${datasetId}.edge_betweenness\`
        WHERE type = 'common'
          AND source IN UNNEST(@nodeIds)
          AND destination IN UNNEST(@nodeIds)
      `;
      const allEdgesOptions = { query: allEdgesQuery, params: { nodeIds: finalSelectedNodeIdsArray } };
      console.log(`[API /api/betweenness/node-graph] Executing final edge query for ${finalSelectedNodeIdsArray.length} selected nodes.`);
      const [allEdgesJob] = await bigquery.createQueryJob(allEdgesOptions);
      const [allEdgeRowsResult] = await allEdgesJob.getQueryResults();
      console.log(`[API /api/betweenness/node-graph] Final edge query returned ${allEdgeRowsResult.length} rows.`);
      
      allEdgeRowsResult.forEach((row: any) => {
        // Ensure we don't add self-loops if source and dest are the same in a row,
        // and that both source and dest are within our selected set.
        if (String(row.source) !== String(row.destination) && 
            selectedNodeIds.has(String(row.source)) && 
            selectedNodeIds.has(String(row.destination))) {
          allLinks.push({
            source: String(row.source),
            target: String(row.destination),
            value: parseFloat(row.shortest_path_share)
          });
        }
      });
    }
    
    // Deduplicate links (e.g., A-B and B-A, keep the one with higher share or just one)
    const linkExistenceMap = new Map<string, GraphLink>();
    allLinks.forEach(link => {
        const key1 = `${link.source}-${link.target}`;
        const key2 = `${link.target}-${link.source}`;
        const existingLink = linkExistenceMap.get(key1) || linkExistenceMap.get(key2);
        if (!existingLink || (existingLink && link.value > existingLink.value)) {
            if (existingLink && linkExistenceMap.has(key2)) linkExistenceMap.delete(key2); // if B-A exists, remove it
            linkExistenceMap.set(key1, link); // Add/replace with A-B
        }
    });
    const uniqueLinks = Array.from(linkExistenceMap.values());
    console.log(`[API /api/betweenness/node-graph] Number of unique links: ${uniqueLinks.length}`);


    // --- Step 4: Fetch aliases and construct GraphNode objects ---
    const nodeIdsForAliasLookup = Array.from(selectedNodeIds);
    if (nodeIdsForAliasLookup.length > 0) {
      const aliasQuery = `
        SELECT nodeid, alias
        FROM \`${projectId}.${datasetId}.nodes\`
        WHERE nodeid IN UNNEST(@nodeIds)
      `;
      const aliasOptions = { query: aliasQuery, params: { nodeIds: nodeIdsForAliasLookup } };
      console.log(`[API /api/betweenness/node-graph] Executing alias query for ${nodeIdsForAliasLookup.length} nodes.`);
      const [aliasJob] = await bigquery.createQueryJob(aliasOptions);
      const [aliasRows] = await aliasJob.getQueryResults();
      console.log(`[API /api/betweenness/node-graph] Alias query returned ${aliasRows.length} rows.`);

      aliasRows.forEach((row: any) => {
        const nodeId = String(row.nodeid);
        const alias = row.alias ? String(row.alias).trim() : null;
        let val: number;
        let color: string;
        let namePrefix = "";
        let nodeIsCentral = false;

        if (nodeId === centralNodeId) {
          val = 10; color = PRIMARY_COLOR_HSL; namePrefix = "Central: "; nodeIsCentral = true;
        } else if (top1stDegreeNeighborIds.includes(nodeId)) {
          val = 7; color = SECONDARY_COLOR_HSL; namePrefix = "1st: ";
        } else {
          val = 5; color = ACCENT_COLOR_HSL; namePrefix = "2nd: ";
        }
        
        nodesMap.set(nodeId, {
          id: nodeId,
          name: `${namePrefix}${alias || `${nodeId.substring(0, 8)}...`}`,
          val,
          isCentralNode: nodeIsCentral,
          color
        });
      });

      // Ensure all selected nodes get an entry, even if no alias found
      nodeIdsForAliasLookup.forEach(nodeId => {
        if (!nodesMap.has(nodeId)) {
          let val: number;
          let color: string;
          let namePrefix = "";
          let nodeIsCentral = false;
          if (nodeId === centralNodeId) { // Should be caught above, but for safety
            val = 10; color = PRIMARY_COLOR_HSL; namePrefix = "Central: "; nodeIsCentral = true;
          } else if (top1stDegreeNeighborIds.includes(nodeId)) {
            val = 7; color = SECONDARY_COLOR_HSL; namePrefix = "1st: ";
          } else { // Must be a 2nd degree if not central or 1st
            val = 5; color = ACCENT_COLOR_HSL; namePrefix = "2nd: ";
          }
           nodesMap.set(nodeId, {
            id: nodeId,
            name: `${namePrefix}${nodeId.substring(0, 8)}...`,
            val,
            isCentralNode: nodeIsCentral,
            color
          });
        }
      });
    }
    
    const finalNodes = Array.from(nodesMap.values());
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

    