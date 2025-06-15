
'use server';

import type { NetworkSubsumptionData, AllTopNodes, OurNodeRanksForAllCategories, NodeDisplayInfo } from '@/lib/types';
// Direct BigQuery imports are removed as logic is now in API routes.
// Helper imports might still be needed if any utility functions were used for data transformation AFTER fetching,
// but for now, we assume API returns data in the shape the UI expects or close to it.

const HOST_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002';
const API_BASE_PATH = '/api/betweenness'; 

export async function fetchTopNodesBySubsumption(limit: number = 3): Promise<AllTopNodes> {
  try {
    const response = await fetch(`${HOST_URL}${API_BASE_PATH}/top-nodes?limit=${limit}`);
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
    const response = await fetch(`${HOST_URL}${API_BASE_PATH}/node-timeline?nodeId=${encodeURIComponent(nodeId)}&aggregation=${encodeURIComponent(aggregationPeriod)}`);
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
    const response = await fetch(`${HOST_URL}${API_BASE_PATH}/node-ranks?nodeId=${encodeURIComponent(nodeIdToFetch)}&aggregation=${encodeURIComponent(aggregationPeriod)}`);
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
    const response = await fetch(`${HOST_URL}${API_BASE_PATH}/node-info?nodeId=${encodeURIComponent(nodeId)}`);
    if (!response.ok) {
      console.error(`API Error fetchNodeDisplayInfo: ${response.status} ${response.statusText}`);
      const errorBody = await response.text();
      console.error("Error body:", errorBody);
      return { nodeId, alias: null }; // Return a default structure
    }
    return await response.json() as NodeDisplayInfo;
  } catch (error) {
    console.error('Network Error fetchNodeDisplayInfo:', error);
    return { nodeId, alias: null };
  }
}

export async function fetchNodeIdByAlias(alias: string): Promise<string | null> {
  try {
    const response = await fetch(`${HOST_URL}${API_BASE_PATH}/resolve-alias?alias=${encodeURIComponent(alias)}`);
    if (!response.ok) {
      console.error(`API Error fetchNodeIdByAlias: ${response.status} ${response.statusText}`);
      const errorBody = await response.text();
      console.error("Error body:", errorBody);
      return null;
    }
    const data = await response.json();
    return data.nodeId || null;
  } catch (error) {
    console.error('Network Error fetchNodeIdByAlias:', error);
    return null;
  }
}
