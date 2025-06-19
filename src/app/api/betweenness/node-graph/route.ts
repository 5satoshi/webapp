
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getBigQueryClient, ensureBigQueryClientInitialized, projectId, datasetId } from '@/services/bigqueryClient';
import { logBigQueryError } from '@/lib/bigqueryUtils';
import type { GraphNode, GraphLink, NodeGraphData } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const centralNodeId = searchParams.get('nodeId');

    if (!centralNodeId) {
      return NextResponse.json({ error: 'nodeId parameter is required' }, { status: 400 });
    }

    await ensureBigQueryClientInitialized();
    const bigquery = getBigQueryClient();

    if (!bigquery) {
      logBigQueryError("API /api/betweenness/node-graph", new Error("BigQuery client not available."));
      return NextResponse.json({ error: 'Database client not available' }, { status: 500 });
    }

    // 1. Fetch relevant edges from edge_betweenness
    const edgesQuery = `
      SELECT
        source,
        destination,
        shortest_path_share
      FROM \`${projectId}.${datasetId}.edge_betweenness\`
      WHERE type = 'common'  -- Assuming 'common' type for graph visualization
        AND (source = @centralNodeId OR destination = @centralNodeId)
        AND shortest_path_share >= 0.001
    `;
    const edgeOptions = {
      query: edgesQuery,
      params: { centralNodeId: centralNodeId }
    };

    const [edgeJob] = await bigquery.createQueryJob(edgeOptions);
    const [edgeRows] = await edgeJob.getQueryResults();

    if (!edgeRows || edgeRows.length === 0) {
      // Return the central node even if no edges are found
      const centralNodeAliasResult = await fetchAliasesForNodeIds([centralNodeId], bigquery);
      const centralNodeAlias = centralNodeAliasResult[centralNodeId] || `${centralNodeId.substring(0, 8)}...`;
      return NextResponse.json({
        nodes: [{ id: centralNodeId, name: centralNodeAlias, val: 10, isCentralNode: true }],
        links: []
      });
    }

    const links: GraphLink[] = edgeRows.map(row => ({
      source: String(row.source),
      target: String(row.destination),
      value: Number(row.shortest_path_share),
    }));

    // 2. Collect all unique node IDs involved
    const involvedNodeIdsSet = new Set<string>();
    involvedNodeIdsSet.add(centralNodeId); // Ensure central node is included
    links.forEach(link => {
      involvedNodeIdsSet.add(link.source);
      involvedNodeIdsSet.add(link.target);
    });
    const involvedNodeIds = Array.from(involvedNodeIdsSet);

    // 3. Fetch aliases for these node IDs from the 'nodes' table
    const aliases = await fetchAliasesForNodeIds(involvedNodeIds, bigquery);

    // 4. Construct the nodes array
    const nodes: GraphNode[] = involvedNodeIds.map(nodeId => {
      const isCentral = nodeId === centralNodeId;
      return {
        id: nodeId,
        name: aliases[nodeId] || `${nodeId.substring(0, 8)}...`, // Use alias or formatted ID
        val: isCentral ? 10 : 5, // Central node slightly larger
        isCentralNode: isCentral,
      };
    });
    
    const responseData: NodeGraphData = { nodes, links };
    return NextResponse.json(responseData);

  } catch (error: any) {
    logBigQueryError('API /api/betweenness/node-graph', error);
    return NextResponse.json({ error: 'Failed to fetch node graph data', details: error.message }, { status: 500 });
  }
}

async function fetchAliasesForNodeIds(nodeIds: string[], bigquery: any): Promise<Record<string, string>> {
  if (nodeIds.length === 0) {
    return {};
  }
  const aliasQuery = `
    SELECT
      nodeid,
      alias
    FROM \`${projectId}.${datasetId}.nodes\`
    WHERE nodeid IN UNNEST(@nodeIds)
  `;
  const aliasOptions = {
    query: aliasQuery,
    params: { nodeIds: nodeIds },
    types: { nodeIds: ['STRING'] } // Specify type for array parameter
  };
  
  try {
    const [aliasJob] = await bigquery.createQueryJob(aliasOptions);
    const [aliasRows] = await aliasJob.getQueryResults();
    
    const aliasMap: Record<string, string> = {};
    aliasRows.forEach((row: any) => {
      if (row.alias && String(row.alias).trim() !== '') {
        aliasMap[String(row.nodeid)] = String(row.alias);
      }
    });
    return aliasMap;
  } catch (error) {
    logBigQueryError('API /api/betweenness/node-graph (fetchAliasesForNodeIds)', error);
    return {}; // Return empty map on error, nodes will use formatted IDs
  }
}
