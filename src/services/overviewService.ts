
'use server';

import type { KeyMetric, TimeSeriesData, BetweennessRankData, ShortestPathShareData, OurNodeRanksForAllCategories } from '@/lib/types';
import { getBigQueryClient, ensureBigQueryClientInitialized, projectId, datasetId } from './bigqueryClient';
import { formatDateFromBQ, getPeriodDateRange, logBigQueryError } from '@/lib/bigqueryUtils';
import { specificNodeId } from '@/lib/constants';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { siteConfig } from '@/config/site';

// Updated order: process.env.INTERNAL_API_HOST -> localhost:PORT -> siteConfig.apiBaseUrl
const INTERNAL_API_HOST_URL = process.env.INTERNAL_API_HOST || (typeof window === 'undefined' ? `http://localhost:${process.env.PORT || '9002'}` : siteConfig.apiBaseUrl) || siteConfig.apiBaseUrl;


export async function fetchKeyMetrics(): Promise<KeyMetric[]> {
  const defaultMetrics: KeyMetric[] = [
      { id: 'forwards_processed', title: 'Total Forwards Processed', displayValue: 'N/A', unit: 'Forwards', iconName: 'Zap' },
      { id: 'fees', title: 'Forwarding Fees Earned', displayValue: 'N/A', unit: 'sats', iconName: 'Activity' },
      { id: 'total_forwarding_volume', title: 'Total Forwarding Volume', displayValue: 'N/A', unit: 'BTC', iconName: 'BarChart3' },
      { id: 'connected_peers', title: 'Connected Peers', displayValue: 'N/A', unit: 'Peers', iconName: 'Users' },
  ];
  
  try {
    await ensureBigQueryClientInitialized();
  } catch (initError: any) {
    logBigQueryError("fetchKeyMetrics (client initialization)", initError);
    return defaultMetrics.map(m => ({ ...m, displayValue: 'Error' }));
  }
  
  const bigquery = getBigQueryClient();

  if (!bigquery) {
    logBigQueryError("fetchKeyMetrics", new Error("BigQuery client not available after initialization attempt."));
    return defaultMetrics.map(m => ({ ...m, displayValue: 'Error' }));
  }

  const forwardsQuery = `
    SELECT COUNT(*) as total_forwards
    FROM \`${projectId}.${datasetId}.forwardings\`
    WHERE status = 'settled'
  `;
  const feesQuery = `
    SELECT SUM(fee_msat) as total_fees_msat
    FROM \`${projectId}.${datasetId}.forwardings\`
    WHERE status = 'settled'
  `;
  const totalForwardingVolumeQuery = `
    SELECT SUM(out_msat) as total_volume_msat
    FROM \`${projectId}.${datasetId}.forwardings\`
    WHERE status = 'settled'
  `;
  const connectedPeersQuery = `
    SELECT COUNT(DISTINCT id) as connected_peers
    FROM \`${projectId}.${datasetId}.peers\`
    WHERE state = 'CHANNELD_NORMAL' OR state = 'DUALOPEND_NORMAL'
  `;

  try {
    const [forwardsJob] = await bigquery.createQueryJob({ query: forwardsQuery });
    const [[forwardsResult]] = await forwardsJob.getQueryResults();

    const [feesJob] = await bigquery.createQueryJob({ query: feesQuery });
    const [[feesResult]] = await feesJob.getQueryResults();

    const [totalForwardingVolumeJob] = await bigquery.createQueryJob({ query: totalForwardingVolumeQuery });
    const [[totalForwardingVolumeResult]] = await totalForwardingVolumeJob.getQueryResults();

    const [connectedPeersJob] = await bigquery.createQueryJob({ query: connectedPeersQuery });
    const [[connectedPeersResult]] = await connectedPeersJob.getQueryResults();

    const totalForwards = Number(forwardsResult?.total_forwards || 0);
    const totalFeesMsat = Number(feesResult?.total_fees_msat || 0);
    const totalForwardingVolumeMsat = Number(totalForwardingVolumeResult?.total_volume_msat || 0);
    const connectedPeers = Number(connectedPeersResult?.connected_peers || 0);

    const totalFeesSats = Math.floor(totalFeesMsat / 1000);
    const totalForwardingVolumeBtc = totalForwardingVolumeMsat / 1000 / 100000000; // msat to sat, then sat to BTC

    return [
      { id: 'forwards_processed', title: 'Total Forwards Processed', displayValue: totalForwards.toLocaleString('en-US'), unit: 'Forwards', iconName: 'Zap' },
      { id: 'fees', title: 'Forwarding Fees Earned', displayValue: totalFeesSats.toLocaleString('en-US'), unit: 'sats', iconName: 'Activity' },
      { id: 'total_forwarding_volume', title: 'Total Forwarding Volume', displayValue: totalForwardingVolumeBtc.toFixed(1), unit: 'BTC', iconName: 'BarChart3' },
      { id: 'connected_peers', title: 'Connected Peers', displayValue: connectedPeers.toLocaleString('en-US'), unit: 'Peers', iconName: 'Users' },
    ];

  } catch (error) {
    logBigQueryError("fetchKeyMetrics (query execution)", error);
    return defaultMetrics.map(m => ({ ...m, displayValue: 'Error' }));
  }
}

export async function fetchHistoricalForwardingVolume(aggregationPeriod: string = 'week'): Promise<TimeSeriesData[]> {
  try {
    await ensureBigQueryClientInitialized();
  } catch (initError: any) {
    logBigQueryError("fetchHistoricalForwardingVolume (client initialization)", initError);
    return [];
  }
  const bigquery = getBigQueryClient();

  if (!bigquery) {
    logBigQueryError("fetchHistoricalForwardingVolume", new Error("BigQuery client not available."));
    return [];
  }

  let dateGroupingExpression = "";
  const limit = 20;

  switch (aggregationPeriod.toLowerCase()) {
    case 'week':
      dateGroupingExpression = "DATE_TRUNC(DATE(received_time), WEEK(MONDAY))";
      break;
    case 'month':
      dateGroupingExpression = "DATE_TRUNC(DATE(received_time), MONTH)";
      break;
    case 'quarter':
      dateGroupingExpression = "DATE_TRUNC(DATE(received_time), QUARTER)";
      break;
    case 'day':
    default:
      dateGroupingExpression = "DATE(received_time)";
      break;
  }

  const query = `
    SELECT
      ${dateGroupingExpression} AS date_group,
      SUM(IF(status = 'settled', out_msat, 0)) AS total_volume_msat,
      COUNTIF(status = 'settled') AS successful_forwards_count
    FROM \`${projectId}.${datasetId}.forwardings\`
    WHERE received_time IS NOT NULL
    GROUP BY date_group
    ORDER BY date_group DESC
    LIMIT ${limit}
  `;

  try {
    const [job] = await bigquery.createQueryJob({ query: query });
    const [rows] = await job.getQueryResults();

    if (!rows || rows.length === 0) {
        return [];
    }

    const formattedAndSortedRows = rows.map(row => {
      if (!row || row.date_group === null || row.date_group === undefined) {
        return null;
      }
      return {
        date: formatDateFromBQ(row.date_group),
        forwardingVolume: Number(row.total_volume_msat || 0) / 100000000000, // msat to BTC
        transactionCount: Number(row.successful_forwards_count || 0),
      };
    }).filter(item => item !== null)
      .sort((a, b) => new Date(a!.date).getTime() - new Date(b!.date).getTime());

    return formattedAndSortedRows as TimeSeriesData[];

  } catch (error) {
    logBigQueryError(`fetchHistoricalForwardingVolume (aggregation: ${aggregationPeriod}, query execution)`, error);
    return [];
  }
}

export async function fetchPeriodForwardingSummary(aggregationPeriod: string): Promise<{ 
  maxPaymentForwardedSats: number; 
  totalFeesEarnedSats: number; 
  currentSuccessRate: number | null;
  previousSuccessRate: number | null; 
}> {
  const defaultReturn = { 
    maxPaymentForwardedSats: 0, 
    totalFeesEarnedSats: 0, 
    currentSuccessRate: null,
    previousSuccessRate: null
  };

  try {
    await ensureBigQueryClientInitialized();
  } catch (initError: any) {
    logBigQueryError("fetchPeriodForwardingSummary (client initialization)", initError);
    return defaultReturn;
  }
  const bigquery = getBigQueryClient();


  if (!bigquery) {
    logBigQueryError("fetchPeriodForwardingSummary", new Error("BigQuery client not available."));
    return defaultReturn;
  }

  const now = new Date();
  let durationDays: number;

  switch (aggregationPeriod.toLowerCase()) {
    case 'day': durationDays = 1; break;
    case 'week': durationDays = 7; break;
    case 'month': durationDays = 30; break;
    case 'quarter': durationDays = 90; break;
    default: durationDays = 7; break; 
  }

  const currentPeriodEndDate = endOfDay(subDays(now, 1));
  const currentPeriodStartDate = startOfDay(subDays(currentPeriodEndDate, durationDays - 1));

  const previousPeriodEndDate = endOfDay(subDays(currentPeriodStartDate, 1));
  const previousPeriodStartDate = startOfDay(subDays(previousPeriodEndDate, durationDays - 1));

  const currentPeriodStartStr = format(currentPeriodStartDate, "yyyy-MM-dd'T'HH:mm:ssXXX");
  const currentPeriodEndStr = format(currentPeriodEndDate, "yyyy-MM-dd'T'HH:mm:ssXXX");
  const previousPeriodStartStr = format(previousPeriodStartDate, "yyyy-MM-dd'T'HH:mm:ssXXX");
  const previousPeriodEndStr = format(previousPeriodEndDate, "yyyy-MM-dd'T'HH:mm:ssXXX");

  const query = `
    SELECT
      MAX(IF(status = 'settled' AND received_time >= TIMESTAMP(@currentPeriodStartStr) AND received_time <= TIMESTAMP(@currentPeriodEndStr), out_msat, NULL)) as max_payment_msat,
      SUM(IF(status = 'settled' AND received_time >= TIMESTAMP(@currentPeriodStartStr) AND received_time <= TIMESTAMP(@currentPeriodEndStr), fee_msat, 0)) as total_fees_msat,
      
      COUNTIF(status = 'settled' AND received_time >= TIMESTAMP(@currentPeriodStartStr) AND received_time <= TIMESTAMP(@currentPeriodEndStr)) as current_successful_forwards,
      COUNTIF(status = 'local_failed' AND received_time >= TIMESTAMP(@currentPeriodStartStr) AND received_time <= TIMESTAMP(@currentPeriodEndStr)) as current_local_fails,
      
      COUNTIF(status = 'settled' AND received_time >= TIMESTAMP(@previousPeriodStartStr) AND received_time <= TIMESTAMP(@previousPeriodEndStr)) as previous_successful_forwards,
      COUNTIF(status = 'local_failed' AND received_time >= TIMESTAMP(@previousPeriodStartStr) AND received_time <= TIMESTAMP(@previousPeriodEndStr)) as previous_local_fails
      
    FROM \`${projectId}.${datasetId}.forwardings\`
    WHERE received_time >= TIMESTAMP(@previousPeriodStartStr) AND received_time <= TIMESTAMP(@currentPeriodEndStr)
  `;

  const options = {
    query: query,
    params: { 
      currentPeriodStartStr, 
      currentPeriodEndStr,
      previousPeriodStartStr,
      previousPeriodEndStr
    }
  };

  try {
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    const result = rows[0] || {};

    const currentSuccessfulForwards = Number(result.current_successful_forwards || 0);
    const currentLocalFails = Number(result.current_local_fails || 0);
    const currentRelevantAttempts = currentSuccessfulForwards + currentLocalFails;
    const currentSuccessRate = currentRelevantAttempts > 0 ? (currentSuccessfulForwards / currentRelevantAttempts) * 100 : null;

    const previousSuccessfulForwards = Number(result.previous_successful_forwards || 0);
    const previousLocalFails = Number(result.previous_local_fails || 0);
    const previousRelevantAttempts = previousSuccessfulForwards + previousLocalFails;
    const previousSuccessRate = previousRelevantAttempts > 0 ? (previousSuccessfulForwards / previousRelevantAttempts) * 100 : null;

    return {
      maxPaymentForwardedSats: Math.floor(Number(result.max_payment_msat || 0) / 1000),
      totalFeesEarnedSats: Math.floor(Number(result.total_fees_msat || 0) / 1000),
      currentSuccessRate: currentSuccessRate !== null ? parseFloat(currentSuccessRate.toFixed(1)) : null,
      previousSuccessRate: previousSuccessRate !== null ? parseFloat(previousSuccessRate.toFixed(1)) : null,
    };
  } catch (error) {
    logBigQueryError(`fetchPeriodForwardingSummary (aggregation: ${aggregationPeriod}, query execution)`, error);
    return defaultReturn;
  }
}


export async function fetchPeriodChannelActivity(aggregationPeriod: string): Promise<{ openedCount: number; closedCount: number; }> {
  const defaultReturn = { openedCount: 0, closedCount: 0 };
  try {
    await ensureBigQueryClientInitialized();
  } catch (initError: any) {
    logBigQueryError("fetchPeriodChannelActivity (client initialization)", initError);
    return defaultReturn;
  }
  const bigquery = getBigQueryClient();


  if (!bigquery) {
    logBigQueryError("fetchPeriodChannelActivity", new Error("BigQuery client not available."));
    return defaultReturn;
  }

  const { startDate, endDate } = getPeriodDateRange(aggregationPeriod);

  const openingOrActiveStates = [
    'OPENINGD', 'CHANNELD_AWAITING_LOCKIN', 'DUALOPEND_OPEN_INIT',
    'DUALOPEND_AWAITING_LOCKIN', 'CHANNELD_NORMAL', 'DUALOPEND_NORMAL'
  ];
  const closingOrClosedStates = [
    'CHANNELD_SHUTTING_DOWN', 'CLOSINGD_SIGEXCHANGE', 'CLOSINGD_COMPLETE',
    'AWAITING_UNILATERAL', 'FUNDING_SPEND_SEEN', 'ONCHAIN', 'CLOSED'
  ];

  const query = `
    WITH ChannelStateChangesInPeriod AS (
      SELECT
        p.id as peer_id,
        p.funding_txid,
        p.funding_outnum,
        TIMESTAMP(change.timestamp) as change_timestamp,
        change.new_state
      FROM
        \`${projectId}.${datasetId}.peers\` p,
        UNNEST(p.state_changes) AS change
      WHERE TIMESTAMP(change.timestamp) >= TIMESTAMP(@startDate) AND TIMESTAMP(change.timestamp) <= TIMESTAMP(@endDate)
    )
    SELECT
      (SELECT COUNT(DISTINCT CONCAT(csc.funding_txid, ':', CAST(csc.funding_outnum AS STRING))) FROM ChannelStateChangesInPeriod csc WHERE csc.new_state IN UNNEST(@openingOrActiveStates)) as opened_count,
      (SELECT COUNT(DISTINCT CONCAT(csc.funding_txid, ':', CAST(csc.funding_outnum AS STRING))) FROM ChannelStateChangesInPeriod csc WHERE csc.new_state IN UNNEST(@closingOrClosedStates)) as closed_count
  `;

  const options = {
    query: query,
    params: {
      startDate: startDate,
      endDate: endDate,
      openingOrActiveStates: openingOrActiveStates,
      closingOrClosedStates: closingOrClosedStates
    }
  };

  try {
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    const result = rows[0] || {};

    return {
      openedCount: Number(result.opened_count || 0),
      closedCount: Number(result.closed_count || 0),
    };
  } catch (error) {
    logBigQueryError(`fetchPeriodChannelActivity (aggregation: ${aggregationPeriod}, query execution)`, error);
    return defaultReturn;
  }
}

export async function fetchBetweennessRank(aggregationPeriod: string): Promise<BetweennessRankData> {
  const nodeId = specificNodeId; 
  const defaultReturn: BetweennessRankData = { latestRank: null, previousRank: null };
  const primaryFetchUrl = `${INTERNAL_API_HOST_URL}/api/betweenness/node-ranks?nodeId=${encodeURIComponent(nodeId)}&aggregation=${encodeURIComponent(aggregationPeriod)}`;

  try {
    const response = await fetch(primaryFetchUrl, { cache: 'no-store' });
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`API Error (Primary) fetchBetweennessRank (nodeId: ${nodeId}, period: ${aggregationPeriod}, URL: ${primaryFetchUrl}): ${response.status} ${response.statusText}`, errorBody);
      if (INTERNAL_API_HOST_URL !== siteConfig.apiBaseUrl && siteConfig.apiBaseUrl) {
        const fallbackFetchUrl = `${siteConfig.apiBaseUrl}/api/betweenness/node-ranks?nodeId=${encodeURIComponent(nodeId)}&aggregation=${encodeURIComponent(aggregationPeriod)}`;
        console.log(`Retrying fetchBetweennessRank with ${fallbackFetchUrl}`);
        const fallbackResponse = await fetch(fallbackFetchUrl, { cache: 'no-store' });
        if (!fallbackResponse.ok) {
          const fallbackErrorBody = await fallbackResponse.text();
          console.error(`API Error (Fallback) fetchBetweennessRank (URL: ${fallbackFetchUrl}): ${fallbackResponse.status} ${fallbackResponse.statusText}`, fallbackErrorBody);
          return defaultReturn;
        }
        const data: OurNodeRanksForAllCategories = await fallbackResponse.json();
        const commonData = data.common;
        return commonData ? { latestRank: commonData.latestRank, previousRank: (commonData.latestRank !== null && commonData.rankChange !== null ? commonData.latestRank - commonData.rankChange : null) } : defaultReturn;
      }
      return defaultReturn;
    }
    const data: OurNodeRanksForAllCategories = await response.json();
    const commonData = data.common;
    return commonData ? { latestRank: commonData.latestRank, previousRank: (commonData.latestRank !== null && commonData.rankChange !== null ? commonData.latestRank - commonData.rankChange : null) } : defaultReturn;

  } catch (error: any) {
    console.error(`Network/JSON Error (Primary) fetchBetweennessRank (nodeId: ${nodeId}, period: ${aggregationPeriod}, URL: ${primaryFetchUrl}):`, error.message);
    if (INTERNAL_API_HOST_URL !== siteConfig.apiBaseUrl && siteConfig.apiBaseUrl) {
      const fallbackFetchUrl = `${siteConfig.apiBaseUrl}/api/betweenness/node-ranks?nodeId=${encodeURIComponent(nodeId)}&aggregation=${encodeURIComponent(aggregationPeriod)}`;
      console.log(`Retrying fetchBetweennessRank with ${fallbackFetchUrl} after primary network error.`);
      try {
        const fallbackResponse = await fetch(fallbackFetchUrl, { cache: 'no-store' });
        if (!fallbackResponse.ok) {
          const fallbackErrorBody = await fallbackResponse.text();
           console.error(`API Error (Fallback) fetchBetweennessRank (URL: ${fallbackFetchUrl}): ${fallbackResponse.status} ${fallbackResponse.statusText}`, fallbackErrorBody);
          return defaultReturn;
        }
        const data: OurNodeRanksForAllCategories = await fallbackResponse.json();
        const commonData = data.common;
        return commonData ? { latestRank: commonData.latestRank, previousRank: (commonData.latestRank !== null && commonData.rankChange !== null ? commonData.latestRank - commonData.rankChange : null) } : defaultReturn;
      } catch (fallbackError: any) {
        console.error(`Network/JSON Error (Fallback) fetchBetweennessRank (URL: ${fallbackFetchUrl}):`, fallbackError.message);
      }
    }
    return defaultReturn;
  }
}

export async function fetchShortestPathShare(aggregationPeriod: string): Promise<ShortestPathShareData> {
  const nodeId = specificNodeId;
  const defaultReturn: ShortestPathShareData = { latestShare: null, previousShare: null };
  const primaryFetchUrl = `${INTERNAL_API_HOST_URL}/api/betweenness/node-ranks?nodeId=${encodeURIComponent(nodeId)}&aggregation=${encodeURIComponent(aggregationPeriod)}`;

  try {
    const response = await fetch(primaryFetchUrl, { cache: 'no-store' });
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`API Error (Primary) fetchShortestPathShare (nodeId: ${nodeId}, period: ${aggregationPeriod}, URL: ${primaryFetchUrl}): ${response.status} ${response.statusText}`, errorBody);
      if (INTERNAL_API_HOST_URL !== siteConfig.apiBaseUrl && siteConfig.apiBaseUrl) {
        const fallbackFetchUrl = `${siteConfig.apiBaseUrl}/api/betweenness/node-ranks?nodeId=${encodeURIComponent(nodeId)}&aggregation=${encodeURIComponent(aggregationPeriod)}`;
        console.log(`Retrying fetchShortestPathShare with ${fallbackFetchUrl}`);
        const fallbackResponse = await fetch(fallbackFetchUrl, { cache: 'no-store' });
        if (!fallbackResponse.ok) {
          const fallbackErrorBody = await fallbackResponse.text();
          console.error(`API Error (Fallback) fetchShortestPathShare (URL: ${fallbackFetchUrl}): ${fallbackResponse.status} ${fallbackResponse.statusText}`, fallbackErrorBody);
          return defaultReturn;
        }
        const data: OurNodeRanksForAllCategories = await fallbackResponse.json();
        return data.common ? { latestShare: data.common.latestShare, previousShare: data.common.previousShare } : defaultReturn;
      }
      return defaultReturn;
    }
    const data: OurNodeRanksForAllCategories = await response.json();
    return data.common ? { latestShare: data.common.latestShare, previousShare: data.common.previousShare } : defaultReturn;

  } catch (error: any) {
    console.error(`Network/JSON Error (Primary) fetchShortestPathShare (nodeId: ${nodeId}, period: ${aggregationPeriod}, URL: ${primaryFetchUrl}):`, error.message);
     if (INTERNAL_API_HOST_URL !== siteConfig.apiBaseUrl && siteConfig.apiBaseUrl) {
      const fallbackFetchUrl = `${siteConfig.apiBaseUrl}/api/betweenness/node-ranks?nodeId=${encodeURIComponent(nodeId)}&aggregation=${encodeURIComponent(aggregationPeriod)}`;
      console.log(`Retrying fetchShortestPathShare with ${fallbackFetchUrl} after primary network error.`);
      try {
        const fallbackResponse = await fetch(fallbackFetchUrl, { cache: 'no-store' });
        if (!fallbackResponse.ok) {
          const fallbackErrorBody = await fallbackResponse.text();
          console.error(`API Error (Fallback) fetchShortestPathShare (URL: ${fallbackFetchUrl}): ${fallbackResponse.status} ${fallbackResponse.statusText}`, fallbackErrorBody);
          return defaultReturn;
        }
        const data: OurNodeRanksForAllCategories = await fallbackResponse.json();
        return data.common ? { latestShare: data.common.latestShare, previousShare: data.common.previousShare } : defaultReturn;
      } catch (fallbackError: any) {
        console.error(`Network/JSON Error (Fallback) fetchShortestPathShare (URL: ${fallbackFetchUrl}):`, fallbackError.message);
      }
    }
    return defaultReturn;
  }
}
    

    
