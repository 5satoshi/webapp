
'use server';

import type { KeyMetric, TimeSeriesData, BetweennessRankData, ShortestPathShareData } from '@/lib/types';
import { getBigQueryClient, ensureBigQueryClientInitialized, projectId, datasetId } from './bigqueryClient';
import { formatDateFromBQ, getPeriodDateRange, logBigQueryError } from '@/lib/bigqueryUtils';
import { specificNodeId } from '@/lib/constants';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

export async function fetchKeyMetrics(): Promise<KeyMetric[]> {
  await ensureBigQueryClientInitialized();
  const bigquery = getBigQueryClient();

  if (!bigquery) {
    logBigQueryError("fetchKeyMetrics", new Error("BigQuery client not available after initialization attempt."));
    return [
        { id: 'forwards_processed', title: 'Total Forwards Processed', displayValue: 'N/A', unit: 'Forwards', iconName: 'Zap' },
        { id: 'fees', title: 'Forwarding Fees Earned', displayValue: 'N/A', unit: 'sats', iconName: 'Activity' },
        { id: 'total_forwarding_volume', title: 'Total Forwarding Volume', displayValue: 'N/A', unit: 'BTC', iconName: 'BarChart3' },
        { id: 'connected_peers', title: 'Connected Peers', displayValue: 'N/A', unit: 'Peers', iconName: 'Users' },
    ];
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
    logBigQueryError("fetchKeyMetrics", error);
    return [
        { id: 'forwards_processed', title: 'Total Forwards Processed', displayValue: 'Error', unit: 'Forwards', iconName: 'Zap' },
        { id: 'fees', title: 'Forwarding Fees Earned', displayValue: 'Error', unit: 'sats', iconName: 'Activity' },
        { id: 'total_forwarding_volume', title: 'Total Forwarding Volume', displayValue: 'Error', unit: 'BTC', iconName: 'BarChart3' },
        { id: 'connected_peers', title: 'Connected Peers', displayValue: 'Error', unit: 'Peers', iconName: 'Users' },
    ];
  }
}

export async function fetchHistoricalForwardingVolume(aggregationPeriod: string = 'week'): Promise<TimeSeriesData[]> {
  await ensureBigQueryClientInitialized();
  const bigquery = getBigQueryClient();

  if (!bigquery) {
    logBigQueryError("fetchHistoricalForwardingVolume", new Error("BigQuery client not available."));
    return [];
  }

  let dateGroupingExpression = "";
  let limit = 20;
  switch (aggregationPeriod.toLowerCase()) {
    case 'week':
      dateGroupingExpression = "DATE_TRUNC(DATE(received_time), WEEK(MONDAY))";
      limit = 12; // Approx 3 months
      break;
    case 'month':
      dateGroupingExpression = "DATE_TRUNC(DATE(received_time), MONTH)";
      limit = 12; // 1 year
      break;
    case 'quarter':
      dateGroupingExpression = "DATE_TRUNC(DATE(received_time), QUARTER)";
      limit = 8; // 2 years
      break;
    case 'day':
    default:
      dateGroupingExpression = "DATE(received_time)";
      limit = 30; // Approx 1 month
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
    logBigQueryError(`fetchHistoricalForwardingVolume (aggregation: ${aggregationPeriod})`, error);
    return [];
  }
}

export async function fetchPeriodForwardingSummary(aggregationPeriod: string): Promise<{ 
  maxPaymentForwardedSats: number; 
  totalFeesEarnedSats: number; 
  currentSuccessRate: number | null;
  previousSuccessRate: number | null; 
}> {
  await ensureBigQueryClientInitialized();
  const bigquery = getBigQueryClient();

  const defaultReturn = { 
    maxPaymentForwardedSats: 0, 
    totalFeesEarnedSats: 0, 
    currentSuccessRate: null,
    previousSuccessRate: null
  };

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
    default: durationDays = 7; break; // Default to week
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
    logBigQueryError(`fetchPeriodForwardingSummary (aggregation: ${aggregationPeriod})`, error);
    return defaultReturn;
  }
}


export async function fetchPeriodChannelActivity(aggregationPeriod: string): Promise<{ openedCount: number; closedCount: number; }> {
  await ensureBigQueryClientInitialized();
  const bigquery = getBigQueryClient();

  if (!bigquery) {
    logBigQueryError("fetchPeriodChannelActivity", new Error("BigQuery client not available."));
    return { openedCount: 0, closedCount: 0 };
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
    logBigQueryError(`fetchPeriodChannelActivity (aggregation: ${aggregationPeriod})`, error);
    return { openedCount: 0, closedCount: 0 };
  }
}

export async function fetchBetweennessRank(aggregationPeriod: string): Promise<BetweennessRankData> {
  await ensureBigQueryClientInitialized();
  const bigquery = getBigQueryClient();

  if (!bigquery) {
    logBigQueryError("fetchBetweennessRank", new Error("BigQuery client not available."));
    return { latestRank: null, previousRank: null };
  }

  const nodeId = specificNodeId; 
  const { startDate: periodStartDateString } = getPeriodDateRange(aggregationPeriod);

  const latestRankQuery = `
    SELECT rank
    FROM \`${projectId}.${datasetId}.betweenness\`
    WHERE nodeid = @nodeId AND type = 'common'
    ORDER BY timestamp DESC
    LIMIT 1
  `;

  const previousRankQuery = `
    SELECT rank
    FROM \`${projectId}.${datasetId}.betweenness\`
    WHERE nodeid = @nodeId AND type = 'common' AND timestamp < TIMESTAMP(@periodStartDate)
    ORDER BY timestamp DESC
    LIMIT 1
  `;

  try {
    const [latestRankJob] = await bigquery.createQueryJob({
      query: latestRankQuery,
      params: { nodeId: nodeId }
    });
    const [[latestRankResult]] = await latestRankJob.getQueryResults();
    const latestRank = latestRankResult?.rank !== undefined && latestRankResult?.rank !== null ? Number(latestRankResult.rank) : null;

    const [previousRankJob] = await bigquery.createQueryJob({
      query: previousRankQuery,
      params: { nodeId: nodeId, periodStartDate: periodStartDateString }
    });
    const [[previousRankResult]] = await previousRankJob.getQueryResults();
    const previousRank = previousRankResult?.rank !== undefined && previousRankResult?.rank !== null ? Number(previousRankResult.rank) : null;

    return { latestRank, previousRank };

  } catch (error) {
    logBigQueryError(`fetchBetweennessRank (nodeId: ${nodeId}, period: ${aggregationPeriod})`, error);
    return { latestRank: null, previousRank: null };
  }
}

export async function fetchShortestPathShare(aggregationPeriod: string): Promise<ShortestPathShareData> {
  await ensureBigQueryClientInitialized();
  const bigquery = getBigQueryClient();
  
  if (!bigquery) {
    logBigQueryError("fetchShortestPathShare", new Error("BigQuery client not available."));
    return { latestShare: null, previousShare: null };
  }

  const nodeId = specificNodeId; 
  const { startDate: periodStartDateString } = getPeriodDateRange(aggregationPeriod);

  const latestShareQuery = `
    SELECT shortest_path_share
    FROM \`${projectId}.${datasetId}.betweenness\`
    WHERE nodeid = @nodeId AND type = 'common'
    ORDER BY timestamp DESC
    LIMIT 1
  `;

  const previousShareQuery = `
    SELECT shortest_path_share
    FROM \`${projectId}.${datasetId}.betweenness\`
    WHERE nodeid = @nodeId AND type = 'common' AND timestamp < TIMESTAMP(@periodStartDate)
    ORDER BY timestamp DESC
    LIMIT 1
  `;

  try {
    const [latestShareJob] = await bigquery.createQueryJob({
      query: latestShareQuery,
      params: { nodeId: nodeId }
    });
    const [[latestShareResult]] = await latestShareJob.getQueryResults();
    const latestShare = latestShareResult?.shortest_path_share !== undefined && latestShareResult?.shortest_path_share !== null ? Number(latestShareResult.shortest_path_share) : null;

    const [previousShareJob] = await bigquery.createQueryJob({
      query: previousShareQuery,
      params: { nodeId: nodeId, periodStartDate: periodStartDateString }
    });
    const [[previousShareResult]] = await previousShareJob.getQueryResults();
    const previousShare = previousShareResult?.shortest_path_share !== undefined && previousShareResult?.shortest_path_share !== null ? Number(previousShareResult.shortest_path_share) : null;

    return { latestShare, previousShare };

  } catch (error) {
    logBigQueryError(`fetchShortestPathShare (nodeId: ${nodeId}, period: ${aggregationPeriod})`, error);
    return { latestShare: null, previousShare: null };
  }
}

    
