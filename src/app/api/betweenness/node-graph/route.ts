
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
      logBigQueryError("API /api/betweenness/node-graph", new Error("BigQuery client not available after initialization."));
      return NextResponse.json({ error: 'Database client not available' }, { status: 500 });
    }
    console.log('[API /api/betweenness/node-graph] BigQuery client obtained.');

    const edgeQuery = `
      SELECT
        source,
        destination,
        shortest_path_share
      FROM \`${projectId}.${datasetId}.edge_betweenness\`
      WHERE (source = @centralNodeId OR destination = @centralNodeId)
        AND type = 'common' 
        AND shortest_path_share >= 0.001
    `;
    const edgeOptions = {
      query: edgeQuery,
      params: { centralNodeId: centralNodeId }
    };
    console.log(`[API /api/betweenness/node-graph] Executing edge query for node: ${centralNodeId}`);
    const [edgeJob] = await bigquery.createQueryJob(edgeOptions);
    const [edgeRows] = await edgeJob.getQueryResults();
    console.log(`[API /api/betweenness/node-graph] Edge query returned ${edgeRows.length} rows.`);

    const nodes = new Map<string, GraphNode>();
    const links: GraphLink[] = [];

    // Add central node first
    nodes.set(centralNodeId, {
      id: centralNodeId,
      name: `Central: ${centralNodeId.substring(0, 8)}...`, // Placeholder, will be updated with alias
      val: 10, // Larger value for central node
      isCentralNode: true,
      color: 'hsl(var(--primary))' // Primary color for central node
    });

    edgeRows.forEach((row: any) => {
      const sourceId = String(row.source);
      const targetId = String(row.destination);
      const share = parseFloat(row.shortest_path_share);

      if (!nodes.has(sourceId)) {
        nodes.set(sourceId, { id: sourceId, name: `${sourceId.substring(0, 8)}...`, val: 5, isCentralNode: false, color: 'hsl(var(--secondary))' });
      }
      if (!nodes.has(targetId)) {
        nodes.set(targetId, { id: targetId, name: `${targetId.substring(0, 8)}...`, val: 5, isCentralNode: false, color: 'hsl(var(--secondary))' });
      }
      links.push({ source: sourceId, target: targetId, value: share });
    });

    const nodeIdsForAliasLookup = Array.from(nodes.keys());
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
        const alias = row.alias ? String(row.alias) : null;
        if (nodes.has(nodeId) && alias) {
          const node = nodes.get(nodeId)!;
          node.name = alias;
           if (node.isCentralNode) {
            node.name = `${alias} (Central)`;
          }
        } else if (nodes.has(nodeId) && node.isCentralNode) {
           const node = nodes.get(nodeId)!;
           node.name = `${nodeId.substring(0,8)}... (Central)`;
        }
      });
    }
    
    // Update name for central node if alias was not found from nodes table
    const centralGraphNode = nodes.get(centralNodeId);
    if (centralGraphNode && centralGraphNode.name === `Central: ${centralNodeId.substring(0, 8)}...`) { // Check if placeholder is still there
      // Attempt to get alias from betweenness table as a fallback for central node, if not already found in nodes
      const centralAliasQuery = `
        SELECT alias FROM \`${projectId}.${datasetId}.betweenness\`
        WHERE nodeid = @centralNodeId AND alias IS NOT NULL
        ORDER BY timestamp DESC
        LIMIT 1
      `;
      const [centralAliasJob] = await bigquery.createQueryJob({query: centralAliasQuery, params: {centralNodeId}});
      const [centralAliasRows] = await centralAliasJob.getQueryResults();
      if (centralAliasRows.length > 0 && centralAliasRows[0].alias) {
        centralGraphNode.name = `${String(centralAliasRows[0].alias)} (Central)`;
      } else {
         centralGraphNode.name = `${centralNodeId.substring(0,8)}... (Central)`;
      }
    }


    const responseData: NodeGraphData = {
      nodes: Array.from(nodes.values()),
      links: links
    };
    console.log(`[API /api/betweenness/node-graph] Successfully prepared graph data. Nodes: ${responseData.nodes.length}, Links: ${responseData.links.length}.`);
    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error(`[API /api/betweenness/node-graph] CRITICAL ERROR in GET handler: ${error.message}`, error);
    logBigQueryError('API /api/betweenness/node-graph', error);
    return NextResponse.json({ error: 'Failed to fetch node graph data', details: error.message }, { status: 500 });
  }
}

// Ensure we opt into dynamic rendering
export const dynamic = 'force-dynamic';
