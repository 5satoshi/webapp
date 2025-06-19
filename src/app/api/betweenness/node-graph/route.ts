
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getBigQueryClient, ensureBigQueryClientInitialized, projectId, datasetId } from '@/services/bigqueryClient';
import { logBigQueryError } from '@/lib/bigqueryUtils';
import type { GraphNode, GraphLink, NodeGraphData } from '@/lib/types';

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

    console.log('[API /api/betweenness/node-graph] Attempting to ensure BigQuery client is initialized...');
    await ensureBigQueryClientInitialized();
    console.log('[API /api/betweenness/node-graph] BigQuery client should be initialized.');

    console.log('[API /api/betweenness/node-graph] Attempting to get BigQuery client...');
    const bigquery = getBigQueryClient();
    console.log(`[API /api/betweenness/node-graph] BigQuery client obtained: ${bigquery ? 'Yes' : 'No'}`);

    if (!bigquery) {
      logBigQueryError("API /api/betweenness/node-graph", new Error("BigQuery client not available."));
      console.error('[API /api/betweenness/node-graph] Error: BigQuery client not available after initialization.');
      return NextResponse.json({ error: 'Database client not available' }, { status: 500 });
    }

    // 1. Fetch relevant edges from edge_betweenness
    const edgesQuery = `
      SELECT
        source,
        destination,
        shortest_path_share
      FROM \`${projectId}.${datasetId}.edge_betweenness\`
      WHERE type = 'common'
        AND (source = @centralNodeId OR destination = @centralNodeId)
        AND shortest_path_share >= 0.001
    `;
    const edgeOptions = {
      query: edgesQuery,
      params: { centralNodeId: centralNodeId }
    };

    console.log(`[API /api/betweenness/node-graph] Executing edges query for nodeId: ${centralNodeId}...`);
    const [edgeJob] = await bigquery.createQueryJob(edgeOptions);
    const [edgeRows] = await edgeJob.getQueryResults();
    console.log(`[API /api/betweenness/node-graph] Edges query completed. Found ${edgeRows ? edgeRows.length : 0} edge rows.`);

    if (!edgeRows || edgeRows.length === 0) {
      console.log(`[API /api/betweenness/node-graph] No edges found for ${centralNodeId}. Returning central node only.`);
      const centralNodeAliasResult = await fetchAliasesForNodeIds([centralNodeId], bigquery);
      const centralNodeAlias = centralNodeAliasResult[centralNodeId] || `${centralNodeId.substring(0, 8)}...`;
      const emptyGraphResponse: NodeGraphData = {
        nodes: [{ id: centralNodeId, name: centralNodeAlias, val: 10, isCentralNode: true }],
        links: []
      };
      console.log('[API /api/betweenness/node-graph] Responding with empty graph structure.');
      return NextResponse.json(emptyGraphResponse);
    }

    const links: GraphLink[] = edgeRows.map(row => ({
      source: String(row.source),
      target: String(row.destination),
      value: Number(row.shortest_path_share),
    }));

    // 2. Collect all unique node IDs involved
    const involvedNodeIdsSet = new Set<string>();
    involvedNodeIdsSet.add(centralNodeId);
    links.forEach(link => {
      involvedNodeIdsSet.add(link.source);
      involvedNodeIdsSet.add(link.target);
    });
    const involvedNodeIds = Array.from(involvedNodeIdsSet);
    console.log(`[API /api/betweenness/node-graph] Total unique node IDs involved: ${involvedNodeIds.length}`);

    // 3. Fetch aliases for these node IDs from the 'nodes' table
    console.log('[API /api/betweenness/node-graph] Fetching aliases for involved node IDs...');
    const aliases = await fetchAliasesForNodeIds(involvedNodeIds, bigquery);
    console.log(`[API /api/betweenness/node-graph] Aliases fetched. Found aliases for ${Object.keys(aliases).length} nodes.`);

    // 4. Construct the nodes array
    const nodes: GraphNode[] = involvedNodeIds.map(nodeId => {
      const isCentral = nodeId === centralNodeId;
      return {
        id: nodeId,
        name: aliases[nodeId] || `${nodeId.substring(0, 8)}...`,
        val: isCentral ? 10 : 5,
        isCentralNode: isCentral,
      };
    });
    
    const responseData: NodeGraphData = { nodes, links };
    console.log('[API /api/betweenness/node-graph] Successfully constructed graph data. Nodes:', nodes.length, 'Links:', links.length);
    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error(`[API /api/betweenness/node-graph] CRITICAL ERROR in GET handler: ${error.message}`, error);
    logBigQueryError('API /api/betweenness/node-graph - Outer Catch', error);
    return NextResponse.json({ error: 'Failed to fetch node graph data', details: error.message }, { status: 500 });
  }
}

async function fetchAliasesForNodeIds(nodeIds: string[], bigquery: any): Promise<Record<string, string>> {
  console.log(`[API /api/betweenness/node-graph/fetchAliasesForNodeIds] Fetching aliases for ${nodeIds.length} node IDs.`);
  if (nodeIds.length === 0) {
    console.log('[API /api/betweenness/node-graph/fetchAliasesForNodeIds] No node IDs provided, returning empty map.');
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
    types: { nodeIds: ['STRING'] } 
  };
  
  try {
    console.log('[API /api/betweenness/node-graph/fetchAliasesForNodeIds] Executing alias query...');
    const [aliasJob] = await bigquery.createQueryJob(aliasOptions);
    const [aliasRows] = await aliasJob.getQueryResults();
    console.log(`[API /api/betweenness/node-graph/fetchAliasesForNodeIds] Alias query completed. Found ${aliasRows ? aliasRows.length : 0} alias rows.`);
    
    const aliasMap: Record<string, string> = {};
    aliasRows.forEach((row: any) => {
      if (row.alias && String(row.alias).trim() !== '') {
        aliasMap[String(row.nodeid)] = String(row.alias);
      }
    });
    console.log(`[API /api/betweenness/node-graph/fetchAliasesForNodeIds] Constructed alias map with ${Object.keys(aliasMap).length} entries.`);
    return aliasMap;
  } catch (error) {
    console.error(`[API /api/betweenness/node-graph/fetchAliasesForNodeIds] Error during alias query: ${error.message}`, error);
    logBigQueryError('API /api/betweenness/node-graph (fetchAliasesForNodeIds)', error);
    return {}; 
  }
}
