
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { NodeGraphData, GraphNode, GraphLink } from '@/lib/types';
import { getBigQueryClient, ensureBigQueryClientInitialized, projectId, datasetId } from '@/services/bigqueryClient';
import { logBigQueryError } from '@/lib/bigqueryUtils';

// Hardcoded HSL values from globals.css for direct use in canvas
const PRIMARY_COLOR_HSL = 'hsl(277, 70%, 36%)';   // --primary (Purple)
const SECONDARY_COLOR_HSL = 'hsl(34, 100%, 50%)'; // --secondary (Orange)
const ACCENT_COLOR_HSL = 'hsl(288, 48%, 60%)';    // --accent (Electric Purple)
const TERTIARY_COLOR_HSL = 'hsl(210, 40%, 96.1%)'; // A light blue/gray for contrast

async function fetchAliasesForNodes(nodeIds: string[]): Promise<Map<string, string>> {
    const aliasMap = new Map<string, string>();
    if (nodeIds.length === 0) return aliasMap;

    try {
        await ensureBigQueryClientInitialized();
        const bigquery = getBigQueryClient();
        if (!bigquery) return aliasMap;

        const aliasQuery = `
            WITH LatestAliases AS (
                SELECT
                    nodeid,
                    alias,
                    ROW_NUMBER() OVER(PARTITION BY nodeid ORDER BY timestamp DESC) as rn
                FROM \`${projectId}.${datasetId}.betweenness\`
                WHERE nodeid IN UNNEST(@nodeIdList) AND alias IS NOT NULL AND TRIM(alias) != ''
            )
            SELECT nodeid, alias FROM LatestAliases WHERE rn = 1
        `;
        const [aliasJob] = await bigquery.createQueryJob({
            query: aliasQuery,
            params: { nodeIdList: nodeIds },
            types: { nodeIdList: ['STRING'] }
        });
        const [aliasRows] = await aliasJob.getQueryResults();

        aliasRows.forEach((row: any) => {
            aliasMap.set(row.nodeid, row.alias);
        });
    } catch (error) {
        logBigQueryError('API /api/betweenness/node-graph (fetchAliasesForNodes)', error);
    }
    return aliasMap;
}

export async function GET(request: NextRequest) {
  const baseUrl = request.nextUrl.origin;
  console.log(`[API /api/betweenness/node-graph] Orchestrator GET request received. Base URL: ${baseUrl}`);

  try {
    const searchParams = request.nextUrl.searchParams;
    const centralNodeId = searchParams.get('nodeId');
    const numNeighborsParam = searchParams.get('numNeighbors');
    const degreeParam = searchParams.get('degree');

    let numNeighbors = 3;
    if (numNeighborsParam) {
      const parsedNum = parseInt(numNeighborsParam, 10);
      if (!isNaN(parsedNum) && parsedNum >= 1 && parsedNum <= 10) {
        numNeighbors = parsedNum;
      }
    }
    
    let maxDegree = 2;
    if (degreeParam) {
        const parsedDegree = parseInt(degreeParam, 10);
        if (!isNaN(parsedDegree) && parsedDegree > 0 && parsedDegree <= 5) {
            maxDegree = parsedDegree;
        }
    }

    if (!centralNodeId) {
      return NextResponse.json({ error: 'nodeId parameter is required' }, { status: 400 });
    }
    
    const nodesMap = new Map<string, GraphNode>();
    const allNodeIdsInGraph = new Set<string>([centralNodeId]);
    let frontierNodeIds = new Set<string>([centralNodeId]);

    // Loop to fetch neighbors degree by degree
    for (let currentDegree = 1; currentDegree <= maxDegree; currentDegree++) {
        if (frontierNodeIds.size === 0) {
            console.log(`[API /api/betweenness/node-graph] Frontier is empty at degree ${currentDegree}. Halting search.`);
            break;
        }

        const frontierIdsString = Array.from(frontierNodeIds).join(',');
        const neighborsUrl = `${baseUrl}/api/betweenness/nearest-neighbors?nodeIds=${encodeURIComponent(frontierIdsString)}&limit=${numNeighbors}`;
        
        console.log(`[API /api/betweenness/node-graph] Fetching degree ${currentDegree} neighbors from: ${neighborsUrl}`);
        const neighborsResponse = await fetch(neighborsUrl, { cache: 'no-store' });

        if (!neighborsResponse.ok) {
            const errorText = await neighborsResponse.text();
            console.error(`[API /api/betweenness/node-graph] Failed to fetch neighbors for degree ${currentDegree}: ${neighborsResponse.status} ${neighborsResponse.statusText}`, errorText);
            break; 
        }

        const neighborsResult: { nodeId: string; share: number }[] = await neighborsResponse.json();
        console.log(`[API /api/betweenness/node-graph] Received ${neighborsResult.length} raw neighbors for degree ${currentDegree}.`);
        
        const nextFrontier = new Set<string>();

        neighborsResult.forEach(neighbor => {
            if (!allNodeIdsInGraph.has(neighbor.nodeId)) {
                allNodeIdsInGraph.add(neighbor.nodeId);
                nextFrontier.add(neighbor.nodeId);

                let color = TERTIARY_COLOR_HSL;
                let val = 2.5;
                if (currentDegree === 1) { color = SECONDARY_COLOR_HSL; val = 3.5; }
                if (currentDegree === 2) { color = ACCENT_COLOR_HSL; val = 3.0; }
                
                nodesMap.set(neighbor.nodeId, {
                    id: neighbor.nodeId,
                    name: `${currentDegree}º: ${neighbor.nodeId.substring(0, 8)}...`, // Placeholder name
                    val: val,
                    isCentralNode: false,
                    color: color,
                });
            }
        });
        
        console.log(`[API /api/betweenness/node-graph] Found ${nextFrontier.size} new unique nodes for next frontier.`);
        frontierNodeIds = nextFrontier;
    }

    // Fetch aliases for all collected nodes at once
    const allIdsArray = Array.from(allNodeIdsInGraph);
    const aliases = await fetchAliasesForNodes(allIdsArray);

    // Add central node and update all node names with aliases
    nodesMap.set(centralNodeId, {
        id: centralNodeId,
        name: `Central: ${aliases.get(centralNodeId) || `${centralNodeId.substring(0, 8)}...`}`,
        val: 5,
        isCentralNode: true,
        color: PRIMARY_COLOR_HSL,
    });
    
    nodesMap.forEach((node, nodeId) => {
        if (!node.isCentralNode && aliases.has(nodeId)) {
            const currentName = node.name; // e.g., "1º: 03xxxx..."
            const degreePrefix = currentName.split(':')[0];
            node.name = `${degreePrefix}: ${aliases.get(nodeId)}`;
        }
    });

    // Fetch edges for the entire graph
    const allNodeIdsString = allIdsArray.join(',');
    const edgeLimit = 500; 
    const edgesUrl = `${baseUrl}/api/betweenness/top-edges?nodeIds=${encodeURIComponent(allNodeIdsString)}&limit=${edgeLimit}`;
    console.log(`[API /api/betweenness/node-graph] Calling edges API: ${edgesUrl}`);
    const edgesResponse = await fetch(edgesUrl, { cache: 'no-store' });

    let finalLinks: GraphLink[] = [];
    if (edgesResponse.ok) {
        const topEdgesResult: { source: string; destination: string; share: number }[] = await edgesResponse.json();
        console.log(`[API /api/betweenness/node-graph] Received ${topEdgesResult.length} edges.`);
        finalLinks = topEdgesResult.map(edge => ({
            source: edge.source,
            target: edge.destination,
            value: edge.share,
        }));
    } else {
         console.error(`[API /api/betweenness/node-graph] Failed to fetch top edges: ${edgesResponse.status} ${edgesResponse.statusText}`);
    }
    
    const finalNodes = Array.from(nodesMap.values());
    const responseData: NodeGraphData = {
        nodes: finalNodes,
        links: finalLinks,
    };

    console.log(`[API /api/betweenness/node-graph] Successfully prepared graph data. Nodes: ${responseData.nodes.length}, Links: ${responseData.links.length}. Responding with data.`);
    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error(`[API /api/betweenness/node-graph] CRITICAL ERROR in orchestrator GET handler: ${error.message}`, error);
    return NextResponse.json({ error: 'Failed to orchestrate node graph data', details: error.message }, { status: 500 });
  }
}
