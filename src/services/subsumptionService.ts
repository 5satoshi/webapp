
'use server';

import type { NetworkSubsumptionData, AllTopNodes, OurNodeRanksForAllCategories, NodeDisplayInfo, NodeGraphData } from '@/lib/types';
import { getBigQueryClient, ensureBigQueryClientInitialized, projectId, datasetId } from './bigqueryClient';
import { logBigQueryError } from '@/lib/bigqueryUtils';
import { siteConfig } from '@/config/site';

const INTERNAL_API_HOST_URL = process.env.INTERNAL_API_HOST || siteConfig.apiBaseUrl || `http://localhost:${process.env.PORT || '9002'}`;

export async function fetchTopNodesBySubsumption(limit: number = 3): Promise<AllTopNodes> {
  try {
    const response = await fetch(`${INTERNAL_API_HOST_URL}/api/betweenness/top-nodes?limit=${limit}`);
    if (!response.ok) {
      console.error(`API Error fetchTopNodesBySubsumption: ${response.status} ${response.statusText}`);
      const errorBody = await response.text();
      console.error("Error body:", errorBody);
      return { micro: [], common: [], macro: [] };
    }
    return await response.json() as AllTopNodes;
  } catch (error) {
    console.error('Network Error fetchTopNodesBySubsumption:', error);
    return { micro: [], common: [], macro: [] };
  }
}

export async function fetchNetworkSubsumptionDataForNode(nodeId: string, aggregationPeriod: string): Promise<NetworkSubsumptionData[]> {
  try {
    const response = await fetch(`${INTERNAL_API_HOST_URL}/api/betweenness/node-timeline?nodeId=${encodeURIComponent(nodeId)}&aggregation=${encodeURIComponent(aggregationPeriod)}`);
    if (!response.ok) {
      console.error(`API Error fetchNetworkSubsumptionDataForNode: ${response.status} ${response.statusText}`);
      const errorBody = await response.text();
      console.error("Error body:", errorBody);
      return [];
    }
    return await response.json() as NetworkSubsumptionData[];
  } catch (error) {
    console.error('Network Error fetchNetworkSubsumptionDataForNode:', error);
    return [];
  }
}

export async function fetchNodeRankForCategories(nodeIdToFetch: string, aggregationPeriod: string): Promise<OurNodeRanksForAllCategories> {
  const defaultRanks: OurNodeRanksForAllCategories = {
    micro: { latestRank: null, rankChange: null, latestShare: null, previousShare: null },
    common: { latestRank: null, rankChange: null, latestShare: null, previousShare: null },
    macro: { latestRank: null, rankChange: null, latestShare: null, previousShare: null },
  };
  try {
    const response = await fetch(`${INTERNAL_API_HOST_URL}/api/betweenness/node-ranks?nodeId=${encodeURIComponent(nodeIdToFetch)}&aggregation=${encodeURIComponent(aggregationPeriod)}`);
    if (!response.ok) {
      console.error(`API Error fetchNodeRankForCategories: ${response.status} ${response.statusText}`);
      const errorBody = await response.text();
      console.error("Error body:", errorBody);
      return defaultRanks;
    }
    return await response.json() as OurNodeRanksForAllCategories;
  } catch (error) {
    console.error('Network Error fetchNodeRankForCategories:', error);
    return defaultRanks;
  }
}

export async function fetchNodeDisplayInfo(nodeId: string): Promise<NodeDisplayInfo | null> {
  try {
    await ensureBigQueryClientInitialized();
  } catch (initError: any) {
    logBigQueryError("fetchNodeDisplayInfo (client init)", initError);
    return { nodeId, alias: null };
  }
  const bigquery = getBigQueryClient();

  if (!bigquery) {
    logBigQueryError("fetchNodeDisplayInfo", new Error("BigQuery client not available."));
    return { nodeId, alias: null };
  }

  // Attempt to get alias from the 'nodes' table first
  const nodesTableQuery = `
    SELECT alias as node_alias
    FROM \`${projectId}.${datasetId}.nodes\`
    WHERE nodeid = @nodeIdToQuery
      AND alias IS NOT NULL AND TRIM(alias) != ''
    LIMIT 1
  `;
  const nodesTableOptions = {
    query: nodesTableQuery,
    params: { nodeIdToQuery: nodeId }
  };

  try {
    const [nodesJob] = await bigquery.createQueryJob(nodesTableOptions);
    const [nodesRows] = await nodesJob.getQueryResults();

    if (nodesRows && nodesRows.length > 0 && nodesRows[0] && nodesRows[0].node_alias) {
      return { nodeId, alias: String(nodesRows[0].node_alias) };
    }
  } catch (error) {
    logBigQueryError('fetchNodeDisplayInfo (query execution on nodes table)', error);
    // Fall through to try peers table if nodes table query fails or returns no alias
  }
  
  // Fallback to 'peers' table if not found or error in 'nodes' table
  const peersTableQuery = `
    SELECT alias.local as node_alias
    FROM \`${projectId}.${datasetId}.peers\`
    WHERE id = @nodeIdToQuery
      AND alias.local IS NOT NULL AND TRIM(alias.local) != ''
    LIMIT 1
  `;
   const peersTableOptions = {
    query: peersTableQuery,
    params: { nodeIdToQuery: nodeId }
  };

  try {
    const [peersJob] = await bigquery.createQueryJob(peersTableOptions);
    const [peersRows] = await peersJob.getQueryResults();
    if (peersRows && peersRows.length > 0 && peersRows[0] && peersRows[0].node_alias) {
      return { nodeId, alias: String(peersRows[0].node_alias) };
    }
  } catch (error) {
     logBigQueryError('fetchNodeDisplayInfo (query execution on peers table)', error);
  }

  return { nodeId, alias: null }; // Default if not found in either table
}

export async function fetchNodeIdByAlias(alias: string): Promise<string | null> {
  try {
    await ensureBigQueryClientInitialized();
  } catch (initError: any) {
    logBigQueryError("fetchNodeIdByAlias (client init)", initError);
    return null;
  }
  const bigquery = getBigQueryClient();

  if (!bigquery) {
    logBigQueryError("fetchNodeIdByAlias", new Error("BigQuery client not available."));
    return null;
  }

  // Query 'nodes' table first
  const nodesTableQuery = `
    SELECT nodeid
    FROM \`${projectId}.${datasetId}.nodes\`
    WHERE alias = @aliasToQuery
    LIMIT 1
  `;
  const nodesTableOptions = {
    query: nodesTableQuery,
    params: { aliasToQuery: alias.trim() }
  };

  try {
    const [nodesJob] = await bigquery.createQueryJob(nodesTableOptions);
    const [nodesRows] = await nodesJob.getQueryResults();

    if (nodesRows && nodesRows.length > 0 && nodesRows[0] && nodesRows[0].nodeid) {
      return String(nodesRows[0].nodeid);
    }
  } catch (error) {
    logBigQueryError('fetchNodeIdByAlias (query execution on nodes table)', error);
    // Fall through to try peers table
  }

  // Fallback to 'peers' table
  const peersTableQuery = `
    SELECT id
    FROM \`${projectId}.${datasetId}.peers\`
    WHERE alias.local = @aliasToQuery
    LIMIT 1
  `;
  const peersTableOptions = {
    query: peersTableQuery,
    params: { aliasToQuery: alias.trim() }
  };
  
  try {
    const [peersJob] = await bigquery.createQueryJob(peersTableOptions);
    const [peersRows] = await peersJob.getQueryResults();
     if (peersRows && peersRows.length > 0 && peersRows[0] && peersRows[0].id) {
      return String(peersRows[0].id);
    }
  } catch (error) {
     logBigQueryError('fetchNodeIdByAlias (query execution on peers table)', error);
  }
  
  return null; // Not found in either table
}

export async function fetchNodeGraphData(nodeId: string): Promise<NodeGraphData | null> {
  if (!nodeId) return null;
  try {
    const response = await fetch(`${INTERNAL_API_HOST_URL}/api/betweenness/node-graph?nodeId=${encodeURIComponent(nodeId)}`);
    if (!response.ok) {
      console.error(`API Error fetchNodeGraphData (nodeId: ${nodeId}): ${response.status} ${response.statusText}`);
      const errorBody = await response.text();
      console.error("Error body:", errorBody);
      return null;
    }
    return await response.json() as NodeGraphData;
  } catch (error) {
    console.error(`Network Error fetchNodeGraphData (nodeId: ${nodeId}):`, error);
    return null;
  }
}
    
