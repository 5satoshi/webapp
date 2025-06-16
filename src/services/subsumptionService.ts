
'use server';

import type { NetworkSubsumptionData, AllTopNodes, OurNodeRanksForAllCategories, NodeDisplayInfo } from '@/lib/types';
import { getBigQueryClient, ensureBigQueryClientInitialized, projectId, datasetId } from './bigqueryClient';
import { logBigQueryError } from '@/lib/bigqueryUtils';
import { siteConfig } from '@/config/site';

const INTERNAL_API_HOST_URL = process.env.INTERNAL_API_HOST || siteConfig.publicUrl || 'http://localhost:9002';

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

  const query = `
    SELECT alias.local as node_alias
    FROM \`${projectId}.${datasetId}.peers\`
    WHERE id = @nodeIdToQuery
      AND alias.local IS NOT NULL AND TRIM(alias.local) != ''
    LIMIT 1
  `;
  const options = {
    query: query,
    params: { nodeIdToQuery: nodeId }
  };

  try {
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    if (rows && rows.length > 0 && rows[0] && rows[0].node_alias) {
      return { nodeId, alias: String(rows[0].node_alias) };
    }
    return { nodeId, alias: null };
  } catch (error) {
    logBigQueryError('fetchNodeDisplayInfo (query execution)', error);
    return { nodeId, alias: null };
  }
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

  const query = `
    SELECT id
    FROM \`${projectId}.${datasetId}.peers\`
    WHERE alias.local = @aliasToQuery
    LIMIT 1
  `;
  const options = {
    query: query,
    params: { aliasToQuery: alias.trim() }
  };

  try {
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    if (rows && rows.length > 0 && rows[0] && rows[0].id) {
      return String(rows[0].id);
    }
    return null;
  } catch (error) {
    logBigQueryError('fetchNodeIdByAlias (query execution)', error);
    return null;
  }
}


    
