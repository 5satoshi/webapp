
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { NodeGraphData, GraphNode, GraphLink } from '@/lib/types';
import { fetchNodeDisplayInfo } from '@/services/subsumptionService';

// Hardcoded HSL values from globals.css for direct use in canvas
const PRIMARY_COLOR_HSL = 'hsl(277, 70%, 36%)';   // --primary (Purple)
const SECONDARY_COLOR_HSL = 'hsl(34, 100%, 50%)'; // --secondary (Orange)
const ACCENT_COLOR_HSL = 'hsl(288, 48%, 60%)';    // --accent (Electric Purple)


export async function GET(request: NextRequest) {
  const baseUrl = request.nextUrl.origin;
  console.log(`[API /api/betweenness/node-graph] Orchestrator GET request received. Base URL: ${baseUrl}`);

  try {
    const searchParams = request.nextUrl.searchParams;
    const centralNodeId = searchParams.get('nodeId');
    const numNeighborsParam = searchParams.get('numNeighbors');
    const degreeParam = searchParams.get('degree');

    let numNeighbors = 3; // Default value
    if (numNeighborsParam) {
      const parsedNum = parseInt(numNeighborsParam, 10);
      if (!isNaN(parsedNum) && parsedNum >= 1 && parsedNum <= 10) {
        numNeighbors = parsedNum;
      }
    }
    
    let maxDegree = 2; // Default degree
    if (degreeParam) {
        const parsedDegree = parseInt(degreeParam, 10);
        if (!isNaN(parsedDegree) && parsedDegree > 0 && parsedDegree <= 2) { // Capped at 2 for now
            maxDegree = parsedDegree;
        }
    }

    if (!centralNodeId) {
      return NextResponse.json({ error: 'nodeId parameter is required' }, { status: 400 });
    }
    
    const degreesToFetch = Array.from({ length: maxDegree }, (_, i) => i + 1).join(',');

    // Step 1: Call nearest-neighbors API
    const neighborsUrl = `${baseUrl}/api/betweenness/nearest-neighbors?nodeId=${encodeURIComponent(centralNodeId)}&limit=${numNeighbors}&degrees=${degreesToFetch}`;
    console.log(`[API /api/betweenness/node-graph] Calling neighbors API: ${neighborsUrl}`);
    const neighborsResponse = await fetch(neighborsUrl, { cache: 'no-store' });

    if (!neighborsResponse.ok) {
        const errorText = await neighborsResponse.text();
        console.error(`[API /api/betweenness/node-graph] Failed to fetch nearest neighbors: ${neighborsResponse.status} ${neighborsResponse.statusText}`, errorText);
        throw new Error(`Failed to fetch nearest neighbors: ${neighborsResponse.statusText}`);
    }

    const neighborsResult: { nodeId: string; alias: string | null; share: number; degree: number }[] = await neighborsResponse.json();
    console.log(`[API /api/betweenness/node-graph] Received ${neighborsResult.length} neighbors.`);

    // Step 2: Process neighbors and prepare for edge fetching
    const nodesMap = new Map<string, GraphNode>();
    const allNodeIds = new Set<string>([centralNodeId]);

    // Add neighbors to the map and ID set
    neighborsResult.forEach(neighbor => {
        allNodeIds.add(neighbor.nodeId);
        
        let color = ACCENT_COLOR_HSL; // Default for 2nd degree and beyond
        if (neighbor.degree === 1) {
            color = SECONDARY_COLOR_HSL;
        }
        
        let val = 2.5; // Default for 2nd degree and beyond
        if (neighbor.degree === 1) {
            val = 3.5;
        }

        nodesMap.set(neighbor.nodeId, {
            id: neighbor.nodeId,
            name: `${neighbor.degree === 1 ? '1st: ' : '2nd: '}${neighbor.alias || `${neighbor.nodeId.substring(0, 8)}...`}`,
            val: val,
            isCentralNode: false,
            color: color,
        });
    });

    // Add central node to the map
    const centralNodeInfo = await fetchNodeDisplayInfo(centralNodeId);
    nodesMap.set(centralNodeId, {
        id: centralNodeId,
        name: `Central: ${centralNodeInfo?.alias || `${centralNodeId.substring(0, 8)}...`}`,
        val: 5,
        isCentralNode: true,
        color: PRIMARY_COLOR_HSL,
    });
    
    // Step 3: Call top-edges API with a dynamic limit
    const allNodeIdsString = Array.from(allNodeIds).join(',');
    const edgesLimit = 2 * numNeighbors * (numNeighbors + 1);
    const edgesUrl = `${baseUrl}/api/betweenness/top-edges?nodeIds=${encodeURIComponent(allNodeIdsString)}&limit=${edgesLimit}`;
    console.log(`[API /api/betweenness/node-graph] Calling edges API: ${edgesUrl}`);
    const edgesResponse = await fetch(edgesUrl, { cache: 'no-store' });

    if (!edgesResponse.ok) {
        const errorText = await edgesResponse.text();
        console.error(`[API /api/betweenness/node-graph] Failed to fetch top edges: ${edgesResponse.status} ${edgesResponse.statusText}`, errorText);
        throw new Error(`Failed to fetch top edges: ${edgesResponse.statusText}`);
    }
    const topEdgesResult: { source: string; destination: string; share: number }[] = await edgesResponse.json();
    console.log(`[API /api/betweenness/node-graph] Received ${topEdgesResult.length} edges.`);

    // Step 4: Process edges
    const finalLinks: GraphLink[] = topEdgesResult.map(edge => ({
        source: edge.source,
        target: edge.destination,
        value: edge.share,
    }));
    
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
