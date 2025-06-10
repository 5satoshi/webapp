
'use server';

import type { KeyMetric, TimeSeriesData, Channel, BetweennessRankData, ShortestPathShareData, ChannelDetails, ForwardingAmountDistributionData, ForwardingValueOverTimeData, HeatmapCell, RoutingActivityData, DailyRoutingVolumeData, NetworkSubsumptionData, TopNodeSubsumptionEntry, AllTopNodes, SingleCategoryTopNode, OurNodeCategoryRank, OurNodeRanksForAllCategories, NodeDisplayInfo } from '@/lib/types';
import { BigQuery, type BigQueryTimestamp, type BigQueryDatetime } from '@google-cloud/bigquery';
import {
  format,
  startOfWeek, startOfMonth, startOfQuarter,
  endOfDay, endOfWeek, endOfMonth, endOfQuarter,
  parseISO,
  subDays, subWeeks, subMonths, subQuarters, startOfDay
} from 'date-fns';
import { specificNodeId } from '@/lib/constants';

const projectId = process.env.BIGQUERY_PROJECT_ID || 'lightning-fee-optimizer';
const datasetId = process.env.BIGQUERY_DATASET_ID || 'version_1';

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
      { id: 'forwards_processed', title: 'Total Forwards Processed', displayValue: totalForwards.toLocaleString('en-US'), unit: 'Forwards', iconName: 'Zap' },
      { id: 'fees', title: 'Forwarding Fees Earned', displayValue: totalFeesSats.toLocaleString('en-US'), unit: 'sats', iconName: 'Activity' },
      { id: 'total_forwarding_volume', title: 'Total Forwarding Volume', displayValue: totalForwardingVolumeBtc.toFixed(4), unit: 'BTC', iconName: 'BarChart3' },
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
  if (!bigquery || !datasetId) {
    console.error("BigQuery client not initialized or datasetId missing for fetchHistoricalForwardingVolume. Returning empty time series.");
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
      SUM(out_msat) AS total_volume_msat,
      COUNT(*) AS transaction_count
    FROM \`${projectId}.${datasetId}.forwardings\`
    WHERE status = 'settled'
      AND received_time IS NOT NULL
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
        uptime: 0, // Placeholder, as uptime is not directly available from this query
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
        out_msat,
        fee_msat
      FROM \`${projectId}.${datasetId}.forwardings\`
      WHERE in_channel = @shortChannelId OR out_channel = @shortChannelId
    ),
    AggregatedForwardingStats AS (
      SELECT
        MIN(IF(f.status = 'settled', f.received_time, NULL)) AS first_tx_timestamp_bq_val,
        MAX(IF(f.status = 'settled', COALESCE(f.resolved_time, f.received_time), NULL)) AS last_tx_timestamp_bq_val,

        COUNTIF(f.status = 'settled') AS total_tx_count_val,

        SUM(IF(f.in_channel = @shortChannelId AND f.status = 'settled', 1, 0)) AS in_tx_count_successful_val,
        SUM(IF(f.in_channel = @shortChannelId, 1, 0)) AS in_tx_count_total_attempts_val,
        SUM(IF(f.in_channel = @shortChannelId AND f.status = 'settled', COALESCE(f.in_msat, 0), 0)) AS in_tx_volume_msat_val,

        SUM(IF(f.out_channel = @shortChannelId AND f.status = 'settled', 1, 0)) AS out_tx_count_successful_val,
        SUM(IF(f.out_channel = @shortChannelId, 1, 0)) AS out_tx_count_total_attempts_val,
        SUM(IF(f.out_channel = @shortChannelId AND f.status = 'settled', COALESCE(f.out_msat, 0), 0)) AS out_tx_volume_msat_val,

        SUM(IF(f.out_channel = @shortChannelId AND f.status = 'settled', COALESCE(f.fee_msat, 0), 0)) AS total_fees_earned_on_this_channel_msat_val
      FROM ForwardingsForChannel f
    )
    SELECT
      agg.first_tx_timestamp_bq_val AS first_tx_timestamp_bq,
      agg.last_tx_timestamp_bq_val AS last_tx_timestamp_bq,
      COALESCE(agg.total_tx_count_val, 0) as total_tx_count,

      COALESCE(agg.in_tx_count_successful_val, 0) as in_tx_count,
      COALESCE(agg.in_tx_volume_msat_val, 0) as in_tx_volume_msat,
      IF(COALESCE(agg.in_tx_count_total_attempts_val, 0) > 0, SAFE_DIVIDE(COALESCE(agg.in_tx_count_successful_val, 0) * 100.0, COALESCE(agg.in_tx_count_total_attempts_val, 0)), 0) AS in_success_rate,

      COALESCE(agg.out_tx_count_successful_val, 0) as out_tx_count,
      COALESCE(agg.out_tx_volume_msat_val, 0) as out_tx_volume_msat,
      IF(COALESCE(agg.out_tx_count_total_attempts_val, 0) > 0, SAFE_DIVIDE(COALESCE(agg.out_tx_count_successful_val, 0) * 100.0, COALESCE(agg.out_tx_count_total_attempts_val, 0)), 0) AS out_success_rate,

      COALESCE(agg.total_fees_earned_on_this_channel_msat_val, 0) as total_fees_earned_msat,

      p.updates.local.fee_base_msat as our_node_fee_base_msat,
      p.updates.local.fee_proportional_millionths as our_node_fee_ppm
    FROM
      \`${projectId}.${datasetId}.peers\` p
    CROSS JOIN
      AggregatedForwardingStats agg
    WHERE
      p.short_channel_id = @shortChannelId
    LIMIT 1
  `;

  const options = {
    query: query,
    params: { shortChannelId: shortChannelId }
  };

  try {
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    if (!rows || rows.length === 0 || !rows[0]) {
      return {
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
        totalFeesEarnedSats: 0,
        ourAdvertisedPolicy: null,
      };
    }

    const result = rows[0];

    const ourNodeBaseMsat = result.our_node_fee_base_msat;
    const ourNodePpm = result.our_node_fee_ppm;
    let ourPolicyString: string | null = null;

    if (ourNodeBaseMsat !== null && ourNodeBaseMsat !== undefined && ourNodePpm !== null && ourNodePpm !== undefined) {
        ourPolicyString = `${Number(ourNodeBaseMsat).toLocaleString('en-US')} msat + ${Number(ourNodePpm).toLocaleString('en-US')} ppm`;
    } else if (ourNodeBaseMsat !== null && ourNodeBaseMsat !== undefined) {
        ourPolicyString = `${Number(ourNodeBaseMsat).toLocaleString('en-US')} msat base`;
    } else if (ourNodePpm !== null && ourNodePpm !== undefined) {
        ourPolicyString = `${Number(ourNodePpm).toLocaleString('en-US')} ppm`;
    }

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
      totalFeesEarnedSats: Math.floor(Number(result.total_fees_earned_msat || 0) / 1000),
      ourAdvertisedPolicy: ourPolicyString,
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
      startOfPeriod = startOfDay(subDays(now, 1));
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

  const nodeId = specificNodeId; // This uses the imported constant for "our node"
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

  const nodeId = specificNodeId; // This uses the imported constant for "our node"
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

export async function fetchForwardingAmountDistribution(aggregationPeriod: string): Promise<ForwardingAmountDistributionData[]> {
  if (!bigquery || !datasetId) {
    console.error("BigQuery client not initialized or datasetId missing for fetchForwardingAmountDistribution.");
    return [];
  }
  const { startDate, endDate } = getPeriodDateRange(aggregationPeriod);

  let paymentRangeCaseStatement: string;
  let paymentRangeOrderByClause: string;
  const aggregationPeriodLower = aggregationPeriod.toLowerCase();

  if (aggregationPeriodLower === 'day') {
    paymentRangeCaseStatement = `
      CASE
        WHEN SAFE_CAST(out_msat AS NUMERIC) / 1000 <= 1000 THEN '0-1k'
        WHEN SAFE_CAST(out_msat AS NUMERIC) / 1000 > 1000 AND SAFE_CAST(out_msat AS NUMERIC) / 1000 <= 10000 THEN '1k-10k'
        WHEN SAFE_CAST(out_msat AS NUMERIC) / 1000 > 10000 AND SAFE_CAST(out_msat AS NUMERIC) / 1000 <= 50000 THEN '10k-50k'
        WHEN SAFE_CAST(out_msat AS NUMERIC) / 1000 > 50000 AND SAFE_CAST(out_msat AS NUMERIC) / 1000 <= 200000 THEN '50k-200k'
        WHEN SAFE_CAST(out_msat AS NUMERIC) / 1000 > 200000 AND SAFE_CAST(out_msat AS NUMERIC) / 1000 <= 1000000 THEN '200k-1M'
        ELSE '>1M'
      END
    `;
    paymentRangeOrderByClause = `
      CASE payment_range
        WHEN '0-1k' THEN 1
        WHEN '1k-10k' THEN 2
        WHEN '10k-50k' THEN 3
        WHEN '50k-200k' THEN 4
        WHEN '200k-1M' THEN 5
        WHEN '>1M' THEN 6
      END
    `;
  } else { // Weeks, Months, Quarters
    paymentRangeCaseStatement = `
      CASE
        WHEN SAFE_CAST(out_msat AS NUMERIC) / 1000 <= 1000 THEN '0-1k'
        WHEN SAFE_CAST(out_msat AS NUMERIC) / 1000 > 1000 AND SAFE_CAST(out_msat AS NUMERIC) / 1000 <= 5000 THEN '1k-5k'
        WHEN SAFE_CAST(out_msat AS NUMERIC) / 1000 > 5000 AND SAFE_CAST(out_msat AS NUMERIC) / 1000 <= 10000 THEN '5k-10k'
        WHEN SAFE_CAST(out_msat AS NUMERIC) / 1000 > 10000 AND SAFE_CAST(out_msat AS NUMERIC) / 1000 <= 25000 THEN '10k-25k'
        WHEN SAFE_CAST(out_msat AS NUMERIC) / 1000 > 25000 AND SAFE_CAST(out_msat AS NUMERIC) / 1000 <= 50000 THEN '25k-50k'
        WHEN SAFE_CAST(out_msat AS NUMERIC) / 1000 > 50000 AND SAFE_CAST(out_msat AS NUMERIC) / 1000 <= 100000 THEN '50k-100k'
        WHEN SAFE_CAST(out_msat AS NUMERIC) / 1000 > 100000 AND SAFE_CAST(out_msat AS NUMERIC) / 1000 <= 250000 THEN '100k-250k'
        WHEN SAFE_CAST(out_msat AS NUMERIC) / 1000 > 250000 AND SAFE_CAST(out_msat AS NUMERIC) / 1000 <= 500000 THEN '250k-500k'
        WHEN SAFE_CAST(out_msat AS NUMERIC) / 1000 > 500000 AND SAFE_CAST(out_msat AS NUMERIC) / 1000 <= 1000000 THEN '500k-1M'
        ELSE '>1M'
      END
    `;
     paymentRangeOrderByClause = `
      CASE payment_range
        WHEN '0-1k' THEN 1
        WHEN '1k-5k' THEN 2
        WHEN '5k-10k' THEN 3
        WHEN '10k-25k' THEN 4
        WHEN '25k-50k' THEN 5
        WHEN '50k-100k' THEN 6
        WHEN '100k-250k' THEN 7
        WHEN '250k-500k' THEN 8
        WHEN '500k-1M' THEN 9
        WHEN '>1M' THEN 10
      END
    `;
  }

  const query = `
    SELECT
      ${paymentRangeCaseStatement} AS payment_range,
      COUNT(*) AS frequency
    FROM \`${projectId}.${datasetId}.forwardings\`
    WHERE status = 'settled'
      AND received_time >= TIMESTAMP(@startDate)
      AND received_time <= TIMESTAMP(@endDate)
      AND out_msat IS NOT NULL
    GROUP BY payment_range
    ORDER BY
      ${paymentRangeOrderByClause}
  `;
  const options = {
    query: query,
    params: { startDate, endDate }
  };
  try {
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    return rows.map(row => ({
      range: String(row.payment_range),
      frequency: Number(row.frequency),
    }));
  } catch (error) {
    logBigQueryError(`fetchForwardingAmountDistribution (aggregation: ${aggregationPeriod})`, error);
    return [];
  }
}

export async function fetchMedianAndMaxForwardingValueOverTime(aggregationPeriod: string): Promise<ForwardingValueOverTimeData[]> {
    if (!bigquery || !datasetId) {
    console.error("BigQuery client not initialized or datasetId missing for fetchMedianAndMaxForwardingValueOverTime.");
    return [];
  }

  let dateGroupingExpression = "";
  let limit = 20; // Default limit

  switch (aggregationPeriod.toLowerCase()) {
    case 'week':
      dateGroupingExpression = "DATE_TRUNC(DATE(received_time), WEEK(MONDAY))";
      limit = 12; // Approx 3 months of weekly data
      break;
    case 'month':
      dateGroupingExpression = "DATE_TRUNC(DATE(received_time), MONTH)";
      limit = 12; // 1 year of monthly data
      break;
    case 'quarter':
      dateGroupingExpression = "DATE_TRUNC(DATE(received_time), QUARTER)";
      limit = 8; // 2 years of quarterly data
      break;
    case 'day':
    default:
      dateGroupingExpression = "DATE(received_time)";
      limit = 30; // Approx 1 month of daily data
      break;
  }

  const query = `
    SELECT
      ${dateGroupingExpression} AS date_group,
      APPROX_QUANTILES(SAFE_CAST(out_msat AS NUMERIC) / 1000, 2)[OFFSET(1)] AS median_value_sats,
      MAX(SAFE_CAST(out_msat AS NUMERIC) / 1000) AS max_value_sats
    FROM \`${projectId}.${datasetId}.forwardings\`
    WHERE status = 'settled'
      AND received_time IS NOT NULL
      AND out_msat IS NOT NULL
    GROUP BY date_group
    ORDER BY date_group DESC
    LIMIT ${limit}
  `;

  try {
    const [job] = await bigquery.createQueryJob({ query });
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
        medianValue: parseFloat(Number(row.median_value_sats || 0).toFixed(0)),
        maxValue: parseFloat(Number(row.max_value_sats || 0).toFixed(0)),
      };
    }).filter(item => item !== null)
      .sort((a,b) => new Date(a!.date).getTime() - new Date(b!.date).getTime());

    return formattedAndSortedRows as ForwardingValueOverTimeData[];
  } catch (error) {
    logBigQueryError(`fetchMedianAndMaxForwardingValueOverTime (aggregation: ${aggregationPeriod})`, error);
    return [];
  }
}


export async function fetchTimingHeatmapData(aggregationPeriod: string = 'week'): Promise<HeatmapCell[]> {
  if (!bigquery || !datasetId) {
    console.error("BigQuery client not initialized or datasetId missing for fetchTimingHeatmapData.");
    return [];
  }

  let queryStartDate: string;
  let queryEndDate: string;
  const now = new Date();
  const effectiveEndDate = endOfDay(subDays(now, 1)); // Data up to yesterday (end of day)

  switch (aggregationPeriod.toLowerCase()) {
    case 'day': // Corresponds to "Last 7 Days" title in chart
      queryStartDate = format(startOfDay(subDays(effectiveEndDate, 6)), "yyyy-MM-dd'T'HH:mm:ssXXX");
      break;
    case 'week': // Corresponds to "Last 4 Weeks" title in chart
      queryStartDate = format(startOfDay(subDays(effectiveEndDate, (4 * 7) - 1)), "yyyy-MM-dd'T'HH:mm:ssXXX");
      break;
    case 'month': // Corresponds to "Last 3 Months" title in chart
      queryStartDate = format(startOfDay(subMonths(startOfDay(effectiveEndDate), 3-1)), "yyyy-MM-dd'T'HH:mm:ssXXX");
      break;
    case 'quarter': // Corresponds to "Last 12 Months" title in chart
      queryStartDate = format(startOfDay(subMonths(startOfDay(effectiveEndDate), 12-1)), "yyyy-MM-dd'T'HH:mm:ssXXX");
      break;
    default: // Fallback to last 7 days for heatmap if period is unknown
      queryStartDate = format(startOfDay(subDays(effectiveEndDate, 6)), "yyyy-MM-dd'T'HH:mm:ssXXX");
      break;
  }
  queryEndDate = format(effectiveEndDate, "yyyy-MM-dd'T'HH:mm:ssXXX");


  const query = `
    SELECT
      EXTRACT(DAYOFWEEK FROM received_time) - 1 AS day_of_week, -- 0 (Sun) to 6 (Sat)
      EXTRACT(HOUR FROM received_time) AS hour_of_day,    -- 0 to 23
      COUNTIF(status = 'settled') AS successful_forwards,
      COUNTIF(status != 'settled') AS failed_forwards
    FROM \`${projectId}.${datasetId}.forwardings\`
    WHERE
      received_time >= TIMESTAMP(@startDate)
      AND received_time <= TIMESTAMP(@endDate)
    GROUP BY
      day_of_week,
      hour_of_day
    ORDER BY
      day_of_week,
      hour_of_day
  `;

  const options = {
    query: query,
    params: { startDate: queryStartDate, endDate: queryEndDate }
  };

  try {
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    return rows.map(row => ({
      day: Number(row.day_of_week),
      hour: Number(row.hour_of_day),
      successfulForwards: Number(row.successful_forwards || 0),
      failedForwards: Number(row.failed_forwards || 0),
    }));

  } catch (error) {
    logBigQueryError(`fetchTimingHeatmapData (aggregation: ${aggregationPeriod})`, error);
    return [];
  }
}

export async function fetchMonthlyRoutingCount(): Promise<RoutingActivityData[]> {
  if (!bigquery || !datasetId) {
    console.error("BigQuery client not initialized or datasetId missing for fetchMonthlyRoutingCount.");
    return [];
  }
  const query = `
    SELECT
      FORMAT_TIMESTAMP('%b', DATE_TRUNC(DATE(received_time), MONTH)) AS month,
      COUNT(*) AS count
    FROM \`${projectId}.${datasetId}.forwardings\`
    WHERE status = 'settled'
      AND received_time >= TIMESTAMP(DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH))
      AND received_time IS NOT NULL
    GROUP BY month
    ORDER BY MIN(DATE_TRUNC(DATE(received_time), MONTH)) -- Order by actual month sequence
  `;
  try {
    const [job] = await bigquery.createQueryJob({ query });
    const [rows] = await job.getQueryResults();

    // Ensure we have 12 months, even if some have 0 count
    const monthMap = new Map<string, number>();
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthName = format(date, 'MMM');
      monthMap.set(monthName, 0);
    }
    rows.forEach(row => {
        if (row.month) { // Check if month is not null or undefined
            monthMap.set(String(row.month), Number(row.count));
        }
    });

    return Array.from(monthMap.entries()).map(([month, count]) => ({ month, count }));

  } catch (error) {
    logBigQueryError("fetchMonthlyRoutingCount", error);
    return [];
  }
}

export async function fetchDailyRoutingVolume(): Promise<DailyRoutingVolumeData[]> {
  if (!bigquery || !datasetId) {
    console.error("BigQuery client not initialized or datasetId missing for fetchDailyRoutingVolume.");
    return [];
  }
  const query = `
    SELECT
      DATE(received_time) AS date,
      SUM(out_msat) AS volume_msat
    FROM \`${projectId}.${datasetId}.forwardings\`
    WHERE status = 'settled'
      AND received_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 42 DAY) -- 6 weeks
      AND received_time IS NOT NULL
    GROUP BY date
    ORDER BY date
  `;
  try {
    const [job] = await bigquery.createQueryJob({ query });
    const [rows] = await job.getQueryResults();

    if (!rows || rows.length === 0) {
        return [];
    }

    return rows.map(row => {
      if (!row || row.date === null || row.date === undefined) {
        return null;
      }
      return {
        date: formatDateFromBQ(row.date),
        volume: Math.floor(Number(row.volume_msat || 0) / 1000), // msat to sat
      };
    }).filter(item => item !== null) as DailyRoutingVolumeData[];

  } catch (error) {
    logBigQueryError("fetchDailyRoutingVolume", error);
    return [];
  }
}

async function fetchTopNodesForCategory(primaryCategory: 'micro' | 'common' | 'macro', limit: number = 3): Promise<SingleCategoryTopNode[]> {
  if (!bigquery || !datasetId) {
    console.error(`BigQuery client not initialized or datasetId missing for fetchTopNodesForCategory (${primaryCategory}).`);
    return [];
  }

  // Step 1: Identify top N node IDs for the primaryCategory along with their primary share and rank.
  const topNodeIdsQuery = `
    WITH RankedNodesForPrimaryCategory AS (
      SELECT
        nodeid,
        alias, -- Alias at the time of this primary category record
        shortest_path_share,
        rank,
        ROW_NUMBER() OVER(PARTITION BY nodeid ORDER BY timestamp DESC) as rn_latest_for_node_in_category
      FROM \`${projectId}.${datasetId}.betweenness\`
      WHERE type = @primaryCategoryType
    )
    SELECT nodeid, alias as primary_alias, shortest_path_share as primary_share, rank as primary_rank
    FROM RankedNodesForPrimaryCategory
    WHERE rn_latest_for_node_in_category = 1 -- Only consider the latest record for each node for this category
    ORDER BY primary_share DESC, primary_rank ASC NULLS LAST, nodeid ASC
    LIMIT @limitValue
  `;

  let topNodesPrimaryData: Array<{ nodeid: string, primary_alias: string | null, primary_share: number | null, primary_rank: number | null }> = [];
  try {
    const [job] = await bigquery.createQueryJob({
      query: topNodeIdsQuery,
      params: { primaryCategoryType: primaryCategory, limitValue: limit }
    });
    topNodesPrimaryData = (await job.getQueryResults())[0] as Array<{ nodeid: string, primary_alias: string | null, primary_share: number | null, primary_rank: number | null }>;
  } catch (error) {
    logBigQueryError(`fetchTopNodesForCategory (${primaryCategory}) - Step 1: Identifying top nodes`, error);
    return [];
  }

  if (topNodesPrimaryData.length === 0) {
    return [];
  }

  const nodeIds = topNodesPrimaryData.map(n => n.nodeid);

  // Step 2: For these node IDs, get their latest stats for ALL categories
  const allStatsForTopNodesQuery = `
    WITH LatestStatsForAllTypes AS (
      SELECT
        nodeid,
        type,
        alias,
        shortest_path_share,
        rank,
        ROW_NUMBER() OVER(PARTITION BY nodeid, type ORDER BY timestamp DESC) as rn_latest_for_type
      FROM \`${projectId}.${datasetId}.betweenness\`
      WHERE nodeid IN UNNEST(@nodeIdList)
        AND type IN ('micro', 'common', 'macro')
    ),
    LatestOverallAlias AS ( -- Get the single most recent alias for each node, regardless of type
      SELECT
        nodeid,
        alias,
        ROW_NUMBER() OVER(PARTITION BY nodeid ORDER BY timestamp DESC) as rn_overall_alias
      FROM \`${projectId}.${datasetId}.betweenness\`
      WHERE nodeid IN UNNEST(@nodeIdList) AND alias IS NOT NULL AND TRIM(alias) != ''
    )
    SELECT
      s.nodeid,
      loa.alias AS display_alias, -- Use the absolute latest alias
      MAX(IF(s.type = 'micro', s.shortest_path_share, NULL)) as micro_share,
      MAX(IF(s.type = 'micro', s.rank, NULL)) as micro_rank,
      MAX(IF(s.type = 'common', s.shortest_path_share, NULL)) as common_share,
      MAX(IF(s.type = 'common', s.rank, NULL)) as common_rank,
      MAX(IF(s.type = 'macro', s.shortest_path_share, NULL)) as macro_share,
      MAX(IF(s.type = 'macro', s.rank, NULL)) as macro_rank
    FROM LatestStatsForAllTypes s
    LEFT JOIN LatestOverallAlias loa ON s.nodeid = loa.nodeid AND loa.rn_overall_alias = 1
    WHERE s.rn_latest_for_type = 1
    GROUP BY s.nodeid, loa.alias
  `;

  let allStatsRows: Array<any> = [];
  try {
    const [job] = await bigquery.createQueryJob({
      query: allStatsForTopNodesQuery,
      params: { nodeIdList: nodeIds }
    });
    allStatsRows = (await job.getQueryResults())[0];
  } catch (error) {
    logBigQueryError(`fetchTopNodesForCategory (${primaryCategory}) - Step 2: Fetching all stats`, error);
    // Continue with potentially partial data if topNodesPrimaryData exists
  }

  // Step 3: Combine results and map
  const results: SingleCategoryTopNode[] = topNodesPrimaryData.map(primaryNode => {
    const allStats = allStatsRows.find(s => s.nodeid === primaryNode.nodeid);
    
    let categoryShare: number | null = null;
    let categoryRank: number | null = null;

    if (allStats) {
        switch (primaryCategory) {
            case 'micro':
                categoryShare = allStats.micro_share !== null ? Number(allStats.micro_share) : null;
                categoryRank = allStats.micro_rank !== null ? Number(allStats.micro_rank) : null;
                break;
            case 'common':
                categoryShare = allStats.common_share !== null ? Number(allStats.common_share) : null;
                categoryRank = allStats.common_rank !== null ? Number(allStats.common_rank) : null;
                break;
            case 'macro':
                categoryShare = allStats.macro_share !== null ? Number(allStats.macro_share) : null;
                categoryRank = allStats.macro_rank !== null ? Number(allStats.macro_rank) : null;
                break;
        }
    } else { // Fallback to primary data if allStats lookup fails for some reason
        categoryShare = primaryNode.primary_share;
        categoryRank = primaryNode.primary_rank;
    }


    return {
      nodeid: primaryNode.nodeid,
      alias: allStats?.display_alias || primaryNode.primary_alias || null,
      categoryShare: categoryShare,
      categoryRank: categoryRank,
      microShare: allStats?.micro_share !== null && allStats?.micro_share !== undefined ? Number(allStats.micro_share) : null,
      microRank: allStats?.micro_rank !== null && allStats?.micro_rank !== undefined ? Number(allStats.micro_rank) : null,
      commonShare: allStats?.common_share !== null && allStats?.common_share !== undefined ? Number(allStats.common_share) : null,
      commonRank: allStats?.common_rank !== null && allStats?.common_rank !== undefined ? Number(allStats.common_rank) : null,
      macroShare: allStats?.macro_share !== null && allStats?.macro_share !== undefined ? Number(allStats.macro_share) : null,
      macroRank: allStats?.macro_rank !== null && allStats?.macro_rank !== undefined ? Number(allStats.macro_rank) : null,
    };
  });
  
  // Re-sort based on the primary category's share, as the GROUP BY in step 2 might alter order
  results.sort((a, b) => {
    const aShare = a.categoryShare ?? -1;
    const bShare = b.categoryShare ?? -1;
    if (bShare !== aShare) {
      return bShare - aShare; // Higher share first
    }
    const aRank = a.categoryRank ?? Infinity;
    const bRank = b.categoryRank ?? Infinity;
    return aRank - bRank; // Lower rank first (if shares are equal)
  });

  return results;
}


export async function fetchTopNodesBySubsumption(limit: number = 3): Promise<AllTopNodes> {
  if (!bigquery || !datasetId) {
    console.error("BigQuery client not initialized or datasetId missing for fetchTopNodesBySubsumption.");
    return { micro: [], common: [], macro: [] };
  }
  try {
    const [microNodes, commonNodes, macroNodes] = await Promise.all([
      fetchTopNodesForCategory('micro', limit),
      fetchTopNodesForCategory('common', limit),
      fetchTopNodesForCategory('macro', limit),
    ]);
    return {
      micro: microNodes,
      common: commonNodes,
      macro: macroNodes,
    };
  } catch (error) {
    logBigQueryError("fetchTopNodesBySubsumption (combined)", error);
    return { micro: [], common: [], macro: [] };
  }
}


export async function fetchNetworkSubsumptionDataForNode(nodeId: string, aggregationPeriod: string): Promise<NetworkSubsumptionData[]> {
  if (!bigquery || !datasetId) {
    console.error("BigQuery client not initialized or datasetId missing for fetchNetworkSubsumptionDataForNode.");
    return [];
  }

  let datePeriodUnit: string;
  let startDate: string;
  const now = new Date();
  const endDate = format(endOfDay(subDays(now, 1)), "yyyy-MM-dd'T'HH:mm:ssXXX"); // Data up to yesterday

  switch (aggregationPeriod.toLowerCase()) {
    case 'week':
      datePeriodUnit = 'WEEK(MONDAY)';
      startDate = format(startOfDay(subWeeks(now, 12)), "yyyy-MM-dd'T'HH:mm:ssXXX"); // Approx 12 weeks
      break;
    case 'month':
      datePeriodUnit = 'MONTH';
      startDate = format(startOfDay(subMonths(now, 12)), "yyyy-MM-dd'T'HH:mm:ssXXX"); // Approx 12 months
      break;
    case 'quarter':
      datePeriodUnit = 'QUARTER';
      startDate = format(startOfDay(subQuarters(now, 8)), "yyyy-MM-dd'T'HH:mm:ssXXX"); // Approx 8 quarters (2 years)
      break;
    case 'day':
    default:
      datePeriodUnit = 'DAY';
      startDate = format(startOfDay(subDays(now, 30)), "yyyy-MM-dd'T'HH:mm:ssXXX"); // Approx 30 days
      break;
  }

  const query = `
    SELECT
      DATE_TRUNC(DATE(timestamp), ${datePeriodUnit}) AS date_group,
      MAX(IF(type = 'micro', shortest_path_share, NULL)) as micro_share,
      MAX(IF(type = 'common', shortest_path_share, NULL)) as common_share,
      MAX(IF(type = 'macro', shortest_path_share, NULL)) as macro_share
    FROM \`${projectId}.${datasetId}.betweenness\`
    WHERE nodeid = @nodeIdToQuery
      AND timestamp >= TIMESTAMP(@startDate)
      AND timestamp <= TIMESTAMP(@endDate)
    GROUP BY date_group
    ORDER BY date_group ASC
  `;

  const options = {
    query: query,
    params: {
      nodeIdToQuery: nodeId,
      startDate: startDate,
      endDate: endDate,
    }
  };

  try {
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    if (!rows || rows.length === 0) {
      return [];
    }

    return rows.map(row => ({
      date: formatDateFromBQ(row.date_group),
      micro: row.micro_share !== null ? parseFloat((Number(row.micro_share) * 100).toFixed(2)) : 0,
      common: row.common_share !== null ? parseFloat((Number(row.common_share) * 100).toFixed(2)) : 0,
      macro: row.macro_share !== null ? parseFloat((Number(row.macro_share) * 100).toFixed(2)) : 0,
    }));
  } catch (error) {
    logBigQueryError(`fetchNetworkSubsumptionDataForNode (nodeId: ${nodeId}, period: ${aggregationPeriod})`, error);
    return [];
  }
}

export async function fetchNodeRankForCategories(nodeIdToFetch: string, aggregationPeriod: string): Promise<OurNodeRanksForAllCategories> {
  const defaultCategoryRank: OurNodeCategoryRank = { latestRank: null, rankChange: null };
  const result: OurNodeRanksForAllCategories = {
    micro: { ...defaultCategoryRank },
    common: { ...defaultCategoryRank },
    macro: { ...defaultCategoryRank },
  };

  if (!bigquery || !datasetId) {
    console.error("BigQuery client not initialized or datasetId missing for fetchNodeRankForCategories.");
    return result;
  }

  const { startDate: periodStartDateString } = getPeriodDateRange(aggregationPeriod);

  const categories: Array<'micro' | 'common' | 'macro'> = ['micro', 'common', 'macro'];

  for (const category of categories) {
    const latestRankQuery = `
      SELECT rank
      FROM \`${projectId}.${datasetId}.betweenness\`
      WHERE nodeid = @nodeIdToQuery AND type = @categoryType
      ORDER BY timestamp DESC
      LIMIT 1
    `;

    const previousRankQuery = `
      SELECT rank
      FROM \`${projectId}.${datasetId}.betweenness\`
      WHERE nodeid = @nodeIdToQuery AND type = @categoryType AND timestamp < TIMESTAMP(@periodStartDate)
      ORDER BY timestamp DESC
      LIMIT 1
    `;

    try {
      const [latestRankJob] = await bigquery.createQueryJob({
        query: latestRankQuery,
        params: { nodeIdToQuery: nodeIdToFetch, categoryType: category }
      });
      const [[latestRankResult]] = await latestRankJob.getQueryResults();
      const latestRank = latestRankResult?.rank !== undefined && latestRankResult?.rank !== null ? Number(latestRankResult.rank) : null;

      result[category].latestRank = latestRank;

      const [previousRankJob] = await bigquery.createQueryJob({
        query: previousRankQuery,
        params: { nodeIdToQuery: nodeIdToFetch, categoryType: category, periodStartDate: periodStartDateString }
      });
      const [[previousRankResult]] = await previousRankJob.getQueryResults();
      const previousRank = previousRankResult?.rank !== undefined && previousRankResult?.rank !== null ? Number(previousRankResult.rank) : null;

      if (latestRank !== null && previousRank !== null) {
        result[category].rankChange = latestRank - previousRank;
      }

    } catch (error) {
      logBigQueryError(`fetchNodeRankForCategories (nodeId: ${nodeIdToFetch}, category: ${category}, period: ${aggregationPeriod})`, error);
      // Keep default nulls for this category on error
    }
  }
  return result;
}

export async function fetchNodeDisplayInfo(nodeId: string): Promise<NodeDisplayInfo | null> {
  if (!bigquery || !datasetId || !nodeId) {
    console.error("BigQuery client not initialized, datasetId, or nodeId missing for fetchNodeDisplayInfo.");
    return null;
  }

  const query = `
    SELECT alias
    FROM \`${projectId}.${datasetId}.betweenness\`
    WHERE nodeid = @nodeIdToQuery
      AND alias IS NOT NULL AND TRIM(alias) != ''
    ORDER BY timestamp DESC
    LIMIT 1
  `;
  const options = {
    query: query,
    params: { nodeIdToQuery: nodeId }
  };

  try {
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    if (rows && rows.length > 0 && rows[0] && rows[0].alias) {
      return {
        nodeId: nodeId,
        alias: String(rows[0].alias),
      };
    }
    return { nodeId: nodeId, alias: null }; // Return with Node ID even if alias not found or is empty
  } catch (error) {
    logBigQueryError(`fetchNodeDisplayInfo (nodeId: ${nodeId})`, error);
    return { nodeId: nodeId, alias: null }; // Return with Node ID on error
  }
}

export async function fetchNodeIdByAlias(alias: string): Promise<string | null> {
  if (!bigquery || !datasetId || !alias || alias.trim() === '') {
    console.error("BigQuery client not initialized, datasetId missing, or alias not provided for fetchNodeIdByAlias.");
    return null;
  }

  const query = `
    SELECT nodeid
    FROM \`${projectId}.${datasetId}.betweenness\`
    WHERE alias = @aliasToQuery
    ORDER BY timestamp DESC
    LIMIT 1
  `;
  const options = {
    query: query,
    params: { aliasToQuery: alias.trim() }
  };

  try {
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    if (rows && rows.length > 0 && rows[0] && rows[0].nodeid) {
      return String(rows[0].nodeid);
    }
    return null; // Alias not found
  } catch (error) {
    logBigQueryError(`fetchNodeIdByAlias (alias: ${alias})`, error);
    return null;
  }
}
