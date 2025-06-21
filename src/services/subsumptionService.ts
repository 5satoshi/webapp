
'use server';

import type { NetworkSubsumptionData, AllTopNodes, OurNodeRanksForAllCategories, NodeDisplayInfo, NodeGraphData } from '@/lib/types';
import { getBigQueryClient, ensureBigQueryClientInitialized, projectId, datasetId } from './bigqueryClient';
import { logBigQueryError } from '@/lib/bigqueryUtils';
import { siteConfig } from '@/config/site';

const INTERNAL_API_HOST_URL = process.env.INTERNAL_API_HOST || (typeof window === 'undefined' ? `http://localhost:${process.env.PORT || '9002'}` : siteConfig.apiBaseUrl) || siteConfig.apiBaseUrl;


export async function fetchTopNodesBySubsumption(limit: number = 3): Promise<AllTopNodes> {
  const fetchUrl = `${INTERNAL_API_HOST_URL}/api/betweenness/top-nodes?limit=${limit}`;
  console.log(`[subsumptionService] Fetching top nodes from: ${fetchUrl}`);
  try {
    const response = await fetch(fetchUrl, { cache: 'no-store' });
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[subsumptionService] API Error fetchTopNodesBySubsumption (URL: ${fetchUrl}): ${response.status} ${response.statusText}`, errorBody);
      return { micro: [], common: [], macro: [] };
    }
    return await response.json() as AllTopNodes;
  } catch (error: any) {
    console.error(`[subsumptionService] Network Error fetchTopNodesBySubsumption (URL: ${fetchUrl}):`, error.message, error);
    if (INTERNAL_API_HOST_URL.startsWith('http://localhost') && siteConfig.apiBaseUrl && !siteConfig.apiBaseUrl.startsWith('http://localhost')) {
      console.log(`[subsumptionService] Retrying fetchTopNodesBySubsumption with ${siteConfig.apiBaseUrl}`);
      const fallbackFetchUrl = `${siteConfig.apiBaseUrl}/api/betweenness/top-nodes?limit=${limit}`;
      try {
        const fallbackResponse = await fetch(fallbackFetchUrl, { cache: 'no-store' });
        if (!fallbackResponse.ok) {
          const fallbackErrorBody = await fallbackResponse.text();
          console.error(`[subsumptionService] Fallback API Error fetchTopNodesBySubsumption (URL: ${fallbackFetchUrl}): ${fallbackResponse.status} ${fallbackResponse.statusText}`, fallbackErrorBody);
          return { micro: [], common: [], macro: [] };
        }
        return await fallbackResponse.json() as AllTopNodes;
      } catch (fallbackError: any) {
        console.error(`[subsumptionService] Fallback Network Error fetchTopNodesBySubsumption (URL: ${fallbackFetchUrl}):`, fallbackError.message, fallbackError);
      }
    }
    return { micro: [], common: [], macro: [] };
  }
}

export async function fetchNetworkSubsumptionDataForNode(nodeId: string, aggregationPeriod: string): Promise<NetworkSubsumptionData[]> {
  const fetchUrl = `${INTERNAL_API_HOST_URL}/api/betweenness/node-timeline?nodeId=${encodeURIComponent(nodeId)}&aggregation=${encodeURIComponent(aggregationPeriod)}`;
  console.log(`[subsumptionService] Fetching network subsumption data for node ${nodeId} from: ${fetchUrl}`);
  try {
    const response = await fetch(fetchUrl, { cache: 'no-store' });
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[subsumptionService] API Error fetchNetworkSubsumptionDataForNode (URL: ${fetchUrl}): ${response.status} ${response.statusText}`, errorBody);
      return [];
    }
    return await response.json() as NetworkSubsumptionData[];
  } catch (error: any) {
    console.error(`[subsumptionService] Network Error fetchNetworkSubsumptionDataForNode (URL: ${fetchUrl}):`, error.message, error);
    if (INTERNAL_API_HOST_URL.startsWith('http://localhost') && siteConfig.apiBaseUrl && !siteConfig.apiBaseUrl.startsWith('http://localhost')) {
      console.log(`[subsumptionService] Retrying fetchNetworkSubsumptionDataForNode with ${siteConfig.apiBaseUrl}`);
      const fallbackFetchUrl = `${siteConfig.apiBaseUrl}/api/betweenness/node-timeline?nodeId=${encodeURIComponent(nodeId)}&aggregation=${encodeURIComponent(aggregationPeriod)}`;
      try {
        const fallbackResponse = await fetch(fallbackFetchUrl, { cache: 'no-store' });
        if (!fallbackResponse.ok) {
          const fallbackErrorBody = await fallbackResponse.text();
          console.error(`[subsumptionService] Fallback API Error fetchNetworkSubsumptionDataForNode (URL: ${fallbackFetchUrl}): ${fallbackResponse.status} ${fallbackResponse.statusText}`, fallbackErrorBody);
          return [];
        }
        return await fallbackResponse.json() as NetworkSubsumptionData[];
      } catch (fallbackError: any) {
        console.error(`[subsumptionService] Fallback Network Error fetchNetworkSubsumptionDataForNode (URL: ${fallbackFetchUrl}):`, fallbackError.message, fallbackError);
      }
    }
    return [];
  }
}

export async function fetchNodeRankForCategories(nodeIdToFetch: string, aggregationPeriod: string): Promise<OurNodeRanksForAllCategories> {
  const defaultRanks: OurNodeRanksForAllCategories = {
    micro: { latestRank: null, rankChange: null, latestShare: null, previousShare: null },
    common: { latestRank: null, rankChange: null, latestShare: null, previousShare: null },
    macro: { latestRank: null, rankChange: null, latestShare: null, previousShare: null },
  };
  const fetchUrl = `${INTERNAL_API_HOST_URL}/api/betweenness/node-ranks?nodeId=${encodeURIComponent(nodeIdToFetch)}&aggregation=${encodeURIComponent(aggregationPeriod)}`;
  console.log(`[subsumptionService] Fetching node ranks for ${nodeIdToFetch} from: ${fetchUrl}`);
  try {
    const response = await fetch(fetchUrl, { cache: 'no-store' });
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[subsumptionService] API Error fetchNodeRankForCategories (URL: ${fetchUrl}): ${response.status} ${response.statusText}`, errorBody);
      return defaultRanks;
    }
    return await response.json() as OurNodeRanksForAllCategories;
  } catch (error: any) {
    console.error(`[subsumptionService] Network Error fetchNodeRankForCategories (URL: ${fetchUrl}):`, error.message, error);
     if (INTERNAL_API_HOST_URL.startsWith('http://localhost') && siteConfig.apiBaseUrl && !siteConfig.apiBaseUrl.startsWith('http://localhost')) {
      console.log(`[subsumptionService] Retrying fetchNodeRankForCategories with ${siteConfig.apiBaseUrl}`);
      const fallbackFetchUrl = `${siteConfig.apiBaseUrl}/api/betweenness/node-ranks?nodeId=${encodeURIComponent(nodeIdToFetch)}&aggregation=${encodeURIComponent(aggregationPeriod)}`;
      try {
        const fallbackResponse = await fetch(fallbackFetchUrl, { cache: 'no-store' });
        if (!fallbackResponse.ok) {
          const fallbackErrorBody = await fallbackResponse.text();
          console.error(`[subsumptionService] Fallback API Error fetchNodeRankForCategories (URL: ${fallbackFetchUrl}): ${fallbackResponse.status} ${fallbackResponse.statusText}`, fallbackErrorBody);
          return defaultRanks;
        }
        return await fallbackResponse.json() as OurNodeRanksForAllCategories;
      } catch (fallbackError: any) {
        console.error(`[subsumptionService] Fallback Network Error fetchNodeRankForCategories (URL: ${fallbackFetchUrl}):`, fallbackError.message, fallbackError);
      }
    }
    return defaultRanks;
  }
}

export async function fetchNodeDisplayInfo(nodeId: string): Promise<NodeDisplayInfo | null> {
  console.log(`[subsumptionService] Fetching display info for nodeId: ${nodeId}`);
  try {
    await ensureBigQueryClientInitialized();
  } catch (initError: any) {
    logBigQueryError("[subsumptionService] fetchNodeDisplayInfo (client init)", initError);
    return { nodeId, alias: null };
  }
  const bigquery = getBigQueryClient();

  if (!bigquery) {
    logBigQueryError("[subsumptionService] fetchNodeDisplayInfo", new Error("BigQuery client not available."));
    return { nodeId, alias: null };
  }

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
      console.log(`[subsumptionService] Found alias in 'nodes' table for ${nodeId}`);
      return { nodeId, alias: String(nodesRows[0].node_alias) };
    }
  } catch (error) {
    logBigQueryError('[subsumptionService] fetchNodeDisplayInfo (query execution on nodes table)', error);
  }
  
  console.log(`[subsumptionService] Alias not found in 'nodes' table for ${nodeId}, trying 'peers' table.`);
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
      console.log(`[subsumptionService] Found alias in 'peers' table for ${nodeId}`);
      return { nodeId, alias: String(peersRows[0].node_alias) };
    }
  } catch (error) {
     logBigQueryError('[subsumptionService] fetchNodeDisplayInfo (query execution on peers table)', error);
  }
  
  console.log(`[subsumptionService] Alias not found in 'peers' table for ${nodeId}. Returning null alias.`);
  return { nodeId, alias: null };
}

export async function fetchNodeIdByAlias(alias: string): Promise<string | null> {
  console.log(`[subsumptionService] Fetching nodeId for alias: ${alias}`);
  try {
    await ensureBigQueryClientInitialized();
  } catch (initError: any) {
    logBigQueryError("[subsumptionService] fetchNodeIdByAlias (client init)", initError);
    return null;
  }
  const bigquery = getBigQueryClient();

  if (!bigquery) {
    logBigQueryError("[subsumptionService] fetchNodeIdByAlias", new Error("BigQuery client not available."));
    return null;
  }

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
      console.log(`[subsumptionService] Found nodeId in 'nodes' table for alias ${alias}`);
      return String(nodesRows[0].nodeid);
    }
  } catch (error) {
    logBigQueryError('[subsumptionService] fetchNodeIdByAlias (query execution on nodes table)', error);
  }

  console.log(`[subsumptionService] NodeId not found in 'nodes' table for alias ${alias}, trying 'peers' table.`);
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
       console.log(`[subsumptionService] Found nodeId in 'peers' table for alias ${alias}`);
      return String(peersRows[0].id);
    }
  } catch (error) {
     logBigQueryError('[subsumptionService] fetchNodeIdByAlias (query execution on peers table)', error);
  }
  
  console.log(`[subsumptionService] NodeId not found for alias ${alias}.`);
  return null;
}

export async function fetchNodeGraphData(nodeId: string, numNeighbors: number = 3, degree: number = 2): Promise<NodeGraphData | null> {
  if (!nodeId) {
    console.log("[subsumptionService] fetchNodeGraphData called with no nodeId.");
    return null;
  }
  const primaryFetchUrl = `${INTERNAL_API_HOST_URL}/api/betweenness/node-graph?nodeId=${encodeURIComponent(nodeId)}&numNeighbors=${numNeighbors}&degree=${degree}`;
  console.log(`[subsumptionService] INTERNAL_API_HOST_URL: ${INTERNAL_API_HOST_URL}`);
  console.log(`[subsumptionService] Attempting to fetch node graph data for ${nodeId} from primary URL: ${primaryFetchUrl}`);
  
  let response;
  try {
    response = await fetch(primaryFetchUrl, { cache: 'no-store' });
    if (!response.ok) {
      const statusAndText = `${response.status} ${response.statusText}`;
      console.error(`[subsumptionService] API Error (Primary) fetchNodeGraphData (nodeId: ${nodeId}, URL: ${primaryFetchUrl}): ${statusAndText}`);
      if (response.status !== 404) {
        try {
          const errorBody = await response.text();
          console.error("Error body (Primary):", errorBody.substring(0, 500));
        } catch (textError: any) {
          console.error("Could not retrieve error body text (Primary):", textError.message);
        }
      }
      if (INTERNAL_API_HOST_URL !== siteConfig.apiBaseUrl && siteConfig.apiBaseUrl) {
         console.log(`[subsumptionService] Primary fetch failed. Retrying with fallback URL using siteConfig.apiBaseUrl for nodeId: ${nodeId}`);
         const fallbackFetchUrl = `${siteConfig.apiBaseUrl}/api/betweenness/node-graph?nodeId=${encodeURIComponent(nodeId)}&numNeighbors=${numNeighbors}&degree=${degree}`;
         console.log(`[subsumptionService] Attempting fallback fetch from: ${fallbackFetchUrl}`);
         response = await fetch(fallbackFetchUrl, { cache: 'no-store' });

         if (!response.ok) {
            const fallbackStatusAndText = `${response.status} ${response.statusText}`;
            console.error(`[subsumptionService] API Error (Fallback) fetchNodeGraphData (nodeId: ${nodeId}, URL: ${fallbackFetchUrl}): ${fallbackStatusAndText}`);
            if (response.status !== 404) {
              try {
                const errorBody = await response.text();
                console.error("Error body (Fallback):", errorBody.substring(0, 500));
              } catch (textError: any) {
                console.error("Could not retrieve error body text (Fallback):", textError.message);
              }
            }
            return null; 
         }
         console.log(`[subsumptionService] Successfully fetched node graph data for ${nodeId} using fallback URL.`);
      } else {
        return null; 
      }
    } else {
      console.log(`[subsumptionService] Successfully fetched node graph data for ${nodeId} using primary URL.`);
    }
    
    const data = await response.json() as NodeGraphData;
    console.log(`[subsumptionService] Parsed graph data. Nodes: ${data.nodes?.length}, Links: ${data.links?.length}`);
    return data;

  } catch (error: any) { 
    console.error(`[subsumptionService] Network Error (Primary) fetchNodeGraphData (nodeId: ${nodeId}, URL: ${primaryFetchUrl}):`, error.message, error);
    if (INTERNAL_API_HOST_URL !== siteConfig.apiBaseUrl && siteConfig.apiBaseUrl) {
      console.log(`[subsumptionService] Primary fetch network error. Retrying with fallback URL using siteConfig.apiBaseUrl for nodeId: ${nodeId}`);
      const fallbackFetchUrl = `${siteConfig.apiBaseUrl}/api/betweenness/node-graph?nodeId=${encodeURIComponent(nodeId)}&numNeighbors=${numNeighbors}&degree=${degree}`;
      console.log(`[subsumptionService] Attempting fallback fetch from: ${fallbackFetchUrl}`);
      try {
        const fallbackResponse = await fetch(fallbackFetchUrl, { cache: 'no-store' });
        if (!fallbackResponse.ok) {
          const fallbackStatusAndText = `${fallbackResponse.status} ${fallbackResponse.statusText}`;
          console.error(`[subsumptionService] API Error (Fallback) fetchNodeGraphData (nodeId: ${nodeId}, URL: ${fallbackFetchUrl}): ${fallbackStatusAndText}`);
           if (fallbackResponse.status !== 404) {
              try {
                const errorBody = await fallbackResponse.text();
                console.error("Error body (Fallback):", errorBody.substring(0, 500));
              } catch (textError: any) {
                console.error("Could not retrieve error body text (Fallback):", textError.message);
              }
            }
          return null; 
        }
        console.log(`[subsumptionService] Successfully fetched node graph data for ${nodeId} using fallback URL after primary network error.`);
        return await fallbackResponse.json() as NodeGraphData;
      } catch (fallbackError: any) { 
        console.error(`[subsumptionService] Network Error (Fallback) fetchNodeGraphData (nodeId: ${nodeId}, URL: ${fallbackFetchUrl}):`, fallbackError.message, fallbackError);
        return null; 
      }
    }
    return null; 
  }
}
