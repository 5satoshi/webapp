
'use server';

import type { KeyMetric, TimeSeriesData, Channel, BetweennessRankData, ShortestPathShareData, ChannelDetails } from '@/lib/types';
import { BigQuery, type BigQueryTimestamp, type BigQueryDatetime } from '@google-cloud/bigquery';
import { 
  format, 
  startOfWeek, startOfMonth, startOfQuarter, 
  endOfDay, endOfWeek, endOfMonth, endOfQuarter, 
  parseISO, 
  subDays, subWeeks, subMonths, subQuarters, startOfDay
} from 'date-fns';

const projectId = process.env.BIGQUERY_PROJECT_ID || 'lightning-fee-optimizer';
const datasetId = process.env.BIGQUERY_DATASET_ID || 'version_1';
const specificNodeId = '03fe8461ebc025880b58021c540e0b7782bb2bcdc99da9822f5c6d2184a59b8f69';

let bigquery: BigQuery | undefined;

function logBigQueryError(context: string, error: any) {
  console.error(`BigQuery Error in ${context}:`, error.message);
  if (error.code) {
    console.error(`Error Code: ${error.code}`);
  }
  if (error.errors) {
    console.error('Detailed Errors:', JSON.stringify(error.errors, null, 2));
  }
  if (error.response?.data) {
    console.error('Error Response Data:', JSON.stringify(error.response.data, null, 2));
  }
  if (error.message.includes("Could not refresh access token")) {
    console.error("This 'Could not refresh access token' error often indicates an issue with the service account credentials (GOOGLE_APPLICATION_CREDENTIALS), its permissions (IAM roles for BigQuery), or that the BigQuery API is not enabled for the project.");
  }
}


try {
  console.log(`Initializing BigQuery client with projectId: ${projectId}, datasetId: ${datasetId}`);
  bigquery = new BigQuery({ projectId });
  console.log("BigQuery client initialized successfully.");
} catch (error) {
  logBigQueryError("BigQuery client initialization", error);
}

function formatTimestampFromBQValue(timestampValue: string | null | undefined): string | null {
  if (!timestampValue) {
    return null;
  }
  try {
    const date = parseISO(timestampValue);
    if (isNaN(date.getTime())) {
      return null;
    }
    return format(date, "yyyy-MM-dd HH:mm:ss");
  } catch (e) {
    console.warn("Failed to parse timestamp from BQ value:", timestampValue, e);
    return null;
  }
}


function formatDateFromBQ(timestamp: BigQueryTimestamp | BigQueryDatetime | string | Date | { value: string }): string {
  if (!timestamp) {
    console.warn("formatDateFromBQ received null or undefined timestamp. Returning today's date as fallback.");
    return format(new Date(), 'yyyy-MM-dd');
  }

  let dateToFormat: Date;

  if (typeof (timestamp as { value: string }).value === 'string') {
    const bqValue = (timestamp as { value: string }).value;
    if (/^\d{4}-\d{2}-\d{2}$/.test(bqValue)) { 
        dateToFormat = parseISO(bqValue + 'T00:00:00Z'); 
    } else {
        dateToFormat = parseISO(bqValue); 
    }
  } else if (typeof timestamp === 'string') {
     if (/^\d{4}-\d{2}-\d{2}$/.test(timestamp)) { 
        dateToFormat = parseISO(timestamp + 'T00:00:00Z'); 
    } else {
        dateToFormat = parseISO(timestamp);
    }
  } else if (timestamp instanceof Date) {
    dateToFormat = timestamp;
  } else {
    console.warn("Unexpected date format in formatDateFromBQ. Received:", JSON.stringify(timestamp), "Returning today's date as fallback.");
    dateToFormat = new Date();
  }
  
  if (isNaN(dateToFormat.getTime())) {
    console.warn("Failed to parse date in formatDateFromBQ. Original value:", JSON.stringify(timestamp), "Returning today's date as fallback.");
    return format(new Date(), 'yyyy-MM-dd');
  }
  
  return format(dateToFormat, 'yyyy-MM-dd');
}

function mapChannelStatus(state: string | null | undefined): Channel['status'] {
  if (!state) return 'inactive';
  const normalizedState = state.toUpperCase();
  switch (normalizedState) {
    case 'CHANNELD_NORMAL': 
    case 'DUALOPEND_NORMAL': 
      return 'active';
    case 'OPENINGD': 
    case 'CHANNELD_AWAITING_LOCKIN': 
    case 'DUALOPEND_OPEN_INIT': 
    case 'DUALOPEND_AWAITING_LOCKIN': 
      return 'pending';
    case 'CHANNELD_SHUTTING_DOWN': 
    case 'CLOSINGD_SIGEXCHANGE': 
    case 'CLOSINGD_COMPLETE': 
    case 'AWAITING_UNILATERAL': 
    case 'FUNDING_SPEND_SEEN': 
    case 'ONCHAIN': 
    case 'DISCONNECTED': 
    case 'CLOSED': 
      return 'inactive';
    default:
      return 'inactive';
  }
}


export async function fetchKeyMetrics(): Promise<KeyMetric[]> {
  if (!bigquery || !datasetId) {
    console.error("BigQuery client not initialized or datasetId missing for fetchKeyMetrics. Returning N/A metrics.");
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
      { id: 'forwards_processed', title: 'Total Forwards Processed', displayValue: totalForwards.toLocaleString(), unit: 'Forwards', iconName: 'Zap' },
      { id: 'fees', title: 'Forwarding Fees Earned', displayValue: totalFeesSats.toLocaleString(), unit: 'sats', iconName: 'Activity' },
      { id: 'total_forwarding_volume', title: 'Total Forwarding Volume', displayValue: totalForwardingVolumeBtc.toFixed(4), unit: 'BTC', iconName: 'BarChart3' },
      { id: 'connected_peers', title: 'Connected Peers', displayValue: connectedPeers.toLocaleString(), unit: 'Peers', iconName: 'Users' },
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

export async function fetchHistoricalForwardingVolume(aggregationPeriod: string = 'day'): Promise<TimeSeriesData[]> {
  if (!bigquery || !datasetId) {
    console.error("BigQuery client not initialized or datasetId missing for fetchHistoricalForwardingVolume. Returning empty time series.");
    return [];
  }

  let dateGroupingExpression = "";
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
      SUM(out_msat) AS total_volume_msat,
      COUNT(*) AS transaction_count
    FROM \`${projectId}.${datasetId}.forwardings\`
    WHERE status = 'settled'
      AND received_time IS NOT NULL
    GROUP BY date_group
    ORDER BY date_group DESC
    LIMIT 20 
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
        forwardingVolume: Number(row.total_volume_msat || 0) / 100000000000, 
        transactionCount: Number(row.transaction_count || 0),
      };
    }).filter(item => item !== null)
      .sort((a, b) => new Date(a!.date).getTime() - new Date(b!.date).getTime()); 
    
    return formattedAndSortedRows as TimeSeriesData[];

  } catch (error) {
    logBigQueryError(`fetchHistoricalForwardingVolume (aggregation: ${aggregationPeriod})`, error);
    return []; 
  }
}

export async function fetchChannels(): Promise<Channel[]> {
  if (!bigquery || !datasetId) {
    console.error("BigQuery client not initialized or datasetId missing for fetchChannels. Returning empty channel list.");
    return [];
  }

  const query = `
    WITH LatestAliases AS (
      SELECT
        nodeid,
        alias,
        ROW_NUMBER() OVER(PARTITION BY nodeid ORDER BY timestamp DESC) as rn
      FROM \`${projectId}.${datasetId}.betweenness\`
      WHERE alias IS NOT NULL AND TRIM(alias) != ''
    ),
    ChannelForwardingStats AS (
      SELECT
        scid,
        SUM(successful_forwards) as successful_forwards,
        SUM(total_forwards) as total_forwards
      FROM (
        SELECT
          in_channel as scid,
          COUNTIF(status = 'settled') as successful_forwards,
          COUNT(*) as total_forwards
        FROM \`${projectId}.${datasetId}.forwardings\`
        WHERE in_channel IS NOT NULL
        GROUP BY in_channel
        UNION ALL
        SELECT
          out_channel as scid,
          COUNTIF(status = 'settled') as successful_forwards,
          COUNT(*) as total_forwards
        FROM \`${projectId}.${datasetId}.forwardings\`
        WHERE out_channel IS NOT NULL
        GROUP BY out_channel
      )
      WHERE scid IS NOT NULL
      GROUP BY scid
    )
    SELECT
      p.id as peer_node_id,        
      p.funding_txid,        
      p.funding_outnum,
      p.short_channel_id, 
      p.msatoshi_total,      
      p.msatoshi_to_us,      
      p.state,
      la.alias AS peer_alias,
      COALESCE(cfs.successful_forwards, 0) as successful_forwards_count,
      COALESCE(cfs.total_forwards, 0) as total_forwards_count           
    FROM \`${projectId}.${datasetId}.peers\` p
    LEFT JOIN LatestAliases la ON p.id = la.nodeid AND la.rn = 1
    LEFT JOIN ChannelForwardingStats cfs ON p.short_channel_id = cfs.scid
    ORDER BY p.state, p.id
  `;

  try {
    const [job] = await bigquery.createQueryJob({ query: query });
    const [rows] = await job.getQueryResults();

    if (!rows || rows.length === 0) {
        return [];
    }

    return rows.map(row => {
      const msatTotal = Number(row.msatoshi_total || 0);
      const msatToUs = Number(row.msatoshi_to_us || 0);
      
      const capacitySats = Math.floor(msatTotal / 1000);
      const localBalanceSats = Math.floor(msatToUs / 1000);
      const remoteBalanceSats = Math.floor((msatTotal - msatToUs) / 1000);
      
      const channelIdString = (row.funding_txid && row.funding_outnum !== null && row.funding_outnum !== undefined) 
                        ? `${row.funding_txid}:${row.funding_outnum}` 
                        : `peer-${row.peer_node_id || 'unknown'}-${Math.random().toString(36).substring(2, 9)}`;

      const successfulForwards = Number(row.successful_forwards_count || 0);
      const totalForwards = Number(row.total_forwards_count || 0);
      const channelStatus = mapChannelStatus(row.state);
      let successRate: number;

      if (totalForwards > 0) {
        successRate = parseFloat(((successfulForwards / totalForwards) * 100).toFixed(1));
      } else {
        successRate = channelStatus === 'active' ? 100 : 0;
      }
      
      return {
        id: channelIdString, 
        shortChannelId: row.short_channel_id ? String(row.short_channel_id) : null,
        peerNodeId: String(row.peer_node_id || 'unknown-peer-id'),
        peerAlias: row.peer_alias || undefined,
        capacity: capacitySats,
        localBalance: localBalanceSats,
        remoteBalance: remoteBalanceSats,
        status: channelStatus,
        historicalPaymentSuccessRate: successRate, 
        lastUpdate: new Date().toISOString(), 
      };
    });

  } catch (error) {
    logBigQueryError("fetchChannels", error);
    return []; 
  }
}

export async function fetchChannelDetails(shortChannelId: string): Promise<ChannelDetails | null> {
  if (!bigquery || !datasetId || !shortChannelId) {
    console.error("BigQuery client not initialized, datasetId missing, or shortChannelId not provided for fetchChannelDetails.");
    return null;
  }

  const query = `
    WITH ForwardingsForChannel AS (
        SELECT
            in_channel,
            out_channel,
            received_time,
            resolved_time,
            status,
            in_msat,
            out_msat
        FROM \`${projectId}.${datasetId}.forwardings\`
        WHERE in_channel = @shortChannelId OR out_channel = @shortChannelId
    ),
    AggregatedStats AS (
        SELECT
            MIN(received_time) AS first_tx_timestamp_bq,
            MAX(COALESCE(resolved_time, received_time)) AS last_tx_timestamp_bq,
            COUNT(*) AS total_tx_count_val,

            SUM(IF(in_channel = @shortChannelId, 1, 0)) AS in_tx_count_total_val,
            SUM(IF(in_channel = @shortChannelId AND status = 'settled', 1, 0)) AS in_tx_count_successful_val,
            SUM(IF(in_channel = @shortChannelId, COALESCE(in_msat, 0), 0)) AS in_tx_volume_msat_val,

            SUM(IF(out_channel = @shortChannelId, 1, 0)) AS out_tx_count_total_val,
            SUM(IF(out_channel = @shortChannelId AND status = 'settled', 1, 0)) AS out_tx_count_successful_val,
            SUM(IF(out_channel = @shortChannelId, COALESCE(out_msat, 0), 0)) AS out_tx_volume_msat_val
        FROM ForwardingsForChannel
    )
    SELECT
        first_tx_timestamp_bq,
        last_tx_timestamp_bq,
        COALESCE(total_tx_count_val, 0) as total_tx_count,
        COALESCE(in_tx_count_total_val, 0) as in_tx_count,
        COALESCE(in_tx_volume_msat_val, 0) as in_tx_volume_msat,
        IF(COALESCE(in_tx_count_total_val, 0) > 0, SAFE_DIVIDE(COALESCE(in_tx_count_successful_val, 0) * 100.0, COALESCE(in_tx_count_total_val, 0)), 0) AS in_success_rate,
        COALESCE(out_tx_count_total_val, 0) as out_tx_count,
        COALESCE(out_tx_volume_msat_val, 0) as out_tx_volume_msat,
        IF(COALESCE(out_tx_count_total_val, 0) > 0, SAFE_DIVIDE(COALESCE(out_tx_count_successful_val, 0) * 100.0, COALESCE(out_tx_count_total_val, 0)), 0) AS out_success_rate
    FROM AggregatedStats
  `;

  const options = {
    query: query,
    params: { shortChannelId: shortChannelId }
  };

  try {
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    if (!rows || rows.length === 0 || !rows[0]) {
      return { // Return default values if no forwarding data found for the channel
        shortChannelId: shortChannelId,
        firstTxTimestamp: null,
        lastTxTimestamp: null,
        totalTxCount: 0,
        inTxCount: 0,
        outTxCount: 0,
        inTxVolumeSats: 0,
        outTxVolumeSats: 0,
        inSuccessRate: 0,
        outSuccessRate: 0,
      };
    }
    
    const result = rows[0];

    return {
      shortChannelId: shortChannelId,
      firstTxTimestamp: formatTimestampFromBQValue(result.first_tx_timestamp_bq?.value),
      lastTxTimestamp: formatTimestampFromBQValue(result.last_tx_timestamp_bq?.value),
      totalTxCount: Number(result.total_tx_count || 0),
      inTxCount: Number(result.in_tx_count || 0),
      outTxCount: Number(result.out_tx_count || 0),
      inTxVolumeSats: Math.floor(Number(result.in_tx_volume_msat || 0) / 1000),
      outTxVolumeSats: Math.floor(Number(result.out_tx_volume_msat || 0) / 1000),
      inSuccessRate: parseFloat(Number(result.in_success_rate || 0).toFixed(2)),
      outSuccessRate: parseFloat(Number(result.out_success_rate || 0).toFixed(2)),
    };

  } catch (error) {
    logBigQueryError(`fetchChannelDetails (shortChannelId: ${shortChannelId})`, error);
    return null;
  }
}


function getPeriodDateRange(aggregationPeriod: string): { startDate: string, endDate: string } {
  const now = new Date();
  const yesterday = endOfDay(subDays(now, 1)); 
  let startOfPeriod: Date;

  switch (aggregationPeriod.toLowerCase()) {
    case 'day': 
      startOfPeriod = startOfDay(subDays(now, 1));
      break;
    case 'week': 
      startOfPeriod = startOfDay(subDays(now, 7));
      break;
    case 'month': 
      startOfPeriod = startOfDay(subDays(now, 30));
      break;
    case 'quarter': 
      startOfPeriod = startOfDay(subDays(now, 90));
      break;
    default: 
      startOfPeriod = startOfDay(subDays(now, 1)); // Default to 'day'
      break;
  }
  return { 
    startDate: format(startOfPeriod, "yyyy-MM-dd'T'HH:mm:ssXXX"), 
    endDate: format(yesterday, "yyyy-MM-dd'T'HH:mm:ssXXX") 
  };
}

export async function fetchPeriodForwardingSummary(aggregationPeriod: string): Promise<{ maxPaymentForwardedSats: number; totalFeesEarnedSats: number; forwardsProcessedCount: number; }> {
  if (!bigquery || !datasetId) {
    console.error("BigQuery client not initialized or datasetId missing for fetchPeriodForwardingSummary.");
    return { maxPaymentForwardedSats: 0, totalFeesEarnedSats: 0, forwardsProcessedCount: 0 };
  }
  
  const { startDate, endDate } = getPeriodDateRange(aggregationPeriod);

  const query = `
    SELECT
      MAX(out_msat) as max_payment_msat,
      SUM(fee_msat) as total_fees_msat,
      COUNT(*) as forwards_count
    FROM \`${projectId}.${datasetId}.forwardings\`
    WHERE status = 'settled'
      AND received_time >= TIMESTAMP(@startDate)
      AND received_time <= TIMESTAMP(@endDate)
  `;

  const options = {
    query: query,
    params: { startDate: startDate, endDate: endDate }
  };

  try {
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    const result = rows[0] || {};

    return {
      maxPaymentForwardedSats: Math.floor(Number(result.max_payment_msat || 0) / 1000),
      totalFeesEarnedSats: Math.floor(Number(result.total_fees_msat || 0) / 1000),
      forwardsProcessedCount: Number(result.forwards_count || 0),
    };
  } catch (error) {
    logBigQueryError(`fetchPeriodForwardingSummary (aggregation: ${aggregationPeriod})`, error);
    return { maxPaymentForwardedSats: 0, totalFeesEarnedSats: 0, forwardsProcessedCount: 0 };
  }
}

export async function fetchPeriodChannelActivity(aggregationPeriod: string): Promise<{ openedCount: number; closedCount: number; }> {
  if (!bigquery || !datasetId) {
    console.error("BigQuery client not initialized or datasetId missing for fetchPeriodChannelActivity.");
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
  if (!bigquery || !datasetId) {
    console.error("BigQuery client not initialized or datasetId missing for fetchBetweennessRank.");
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
  if (!bigquery || !datasetId) {
    console.error("BigQuery client not initialized or datasetId missing for fetchShortestPathShare.");
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
