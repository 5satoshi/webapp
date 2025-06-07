
'use server';

import type { KeyMetric, TimeSeriesData, Channel } from '@/lib/types';
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
        { id: 'payments', title: 'Total Payments Processed', displayValue: 'N/A', unit: 'Payments', iconName: 'Zap' },
        { id: 'fees', title: 'Forwarding Fees Earned', displayValue: 'N/A', unit: 'sats', iconName: 'Activity' },
        { id: 'active_channels', title: 'Active Channels', displayValue: 'N/A', unit: 'Channels', iconName: 'Network' },
        { id: 'connected_peers', title: 'Connected Peers', displayValue: 'N/A', unit: 'Peers', iconName: 'Users' },
    ];
  }

  const paymentsQuery = `
    SELECT COUNT(*) as total_payments
    FROM \`${projectId}.${datasetId}.forwardings\`
    WHERE status = 'settled'
  `;
  const feesQuery = `
    SELECT SUM(fee_msat) as total_fees_msat
    FROM \`${projectId}.${datasetId}.forwardings\`
    WHERE status = 'settled'
  `;
  const activeChannelsQuery = `
    SELECT COUNT(*) as active_channels
    FROM \`${projectId}.${datasetId}.peers\` 
    WHERE state = 'CHANNELD_NORMAL' OR state = 'DUALOPEND_NORMAL'
  `;
  const connectedPeersQuery = `
    SELECT COUNT(DISTINCT id) as connected_peers 
    FROM \`${projectId}.${datasetId}.peers\` 
    WHERE state = 'CHANNELD_NORMAL' OR state = 'DUALOPEND_NORMAL'
  `;
  
  try {
    const [paymentsJob] = await bigquery.createQueryJob({ query: paymentsQuery });
    const [[paymentsResult]] = await paymentsJob.getQueryResults();
    
    const [feesJob] = await bigquery.createQueryJob({ query: feesQuery });
    const [[feesResult]] = await feesJob.getQueryResults();

    const [activeChannelsJob] = await bigquery.createQueryJob({ query: activeChannelsQuery });
    const [[activeChannelsResult]] = await activeChannelsJob.getQueryResults();
    
    const [connectedPeersJob] = await bigquery.createQueryJob({ query: connectedPeersQuery });
    const [[connectedPeersResult]] = await connectedPeersJob.getQueryResults();
        
    const totalPayments = Number(paymentsResult?.total_payments || 0);
    const totalFeesMsat = Number(feesResult?.total_fees_msat || 0);
    const activeChannels = Number(activeChannelsResult?.active_channels || 0);
    const connectedPeers = Number(connectedPeersResult?.connected_peers || 0);

    const totalFeesSats = Math.floor(totalFeesMsat / 1000);

    return [
      { id: 'payments', title: 'Total Payments Processed', displayValue: totalPayments.toLocaleString(), unit: 'Payments', iconName: 'Zap' },
      { id: 'fees', title: 'Forwarding Fees Earned', displayValue: totalFeesSats.toLocaleString(), unit: 'sats', iconName: 'Activity' },
      { id: 'active_channels', title: 'Active Channels', displayValue: activeChannels.toLocaleString(), unit: 'Channels', iconName: 'Network' },
      { id: 'connected_peers', title: 'Connected Peers', displayValue: connectedPeers.toLocaleString(), unit: 'Peers', iconName: 'Users' },
    ];

  } catch (error) {
    logBigQueryError("fetchKeyMetrics", error);
    return [
        { id: 'payments', title: 'Total Payments Processed', displayValue: 'Error', unit: 'Payments', iconName: 'Zap' },
        { id: 'fees', title: 'Forwarding Fees Earned', displayValue: 'Error', unit: 'sats', iconName: 'Activity' },
        { id: 'active_channels', title: 'Active Channels', displayValue: 'Error', unit: 'Channels', iconName: 'Network' },
        { id: 'connected_peers', title: 'Connected Peers', displayValue: 'Error', unit: 'Peers', iconName: 'Users' },
    ];
  }
}

export async function fetchHistoricalPaymentVolume(aggregationPeriod: string = 'day'): Promise<TimeSeriesData[]> {
  if (!bigquery || !datasetId) {
    console.error("BigQuery client not initialized or datasetId missing for fetchHistoricalPaymentVolume. Returning empty time series.");
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
        paymentVolume: Number(row.total_volume_msat || 0) / 100000000000, 
        transactionCount: Number(row.transaction_count || 0),
      };
    }).filter(item => item !== null)
      .sort((a, b) => new Date(a!.date).getTime() - new Date(b!.date).getTime()); 
    
    return formattedAndSortedRows as TimeSeriesData[];

  } catch (error) {
    logBigQueryError(`fetchHistoricalPaymentVolume (aggregation: ${aggregationPeriod})`, error);
    return []; 
  }
}

export async function fetchChannels(): Promise<Channel[]> {
  if (!bigquery || !datasetId) {
    console.error("BigQuery client not initialized or datasetId missing for fetchChannels. Returning empty channel list.");
    return [];
  }

  const query = `
    SELECT
      id,
      funding_txid,        
      funding_outnum,      
      msatoshi_total,      
      msatoshi_to_us,      
      state                
    FROM \`${projectId}.${datasetId}.peers\`
    ORDER BY state, id
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
                        : `peer-${row.id || 'unknown'}-${Math.random().toString(36).substring(2, 9)}`;


      return {
        id: channelIdString, 
        peerNodeId: String(row.id || 'unknown-peer-id'),
        capacity: capacitySats,
        localBalance: localBalanceSats,
        remoteBalance: remoteBalanceSats,
        status: mapChannelStatus(row.state),
        uptime: mapChannelStatus(row.state) === 'active' ? 100 : 90, 
        historicalPaymentSuccessRate: mapChannelStatus(row.state) === 'active' ? 99 : 95, 
        lastUpdate: new Date().toISOString(), 
      };
    });

  } catch (error) {
    logBigQueryError("fetchChannels", error);
    return []; 
  }
}

function getPeriodDateRange(aggregationPeriod: string): { startDate: string, endDate: string } {
  const now = new Date();
  let startOfPeriod: Date;
  let endOfPeriod: Date;

  switch (aggregationPeriod.toLowerCase()) {
    case 'day':
      const yesterday = subDays(now, 1);
      startOfPeriod = startOfDay(yesterday);
      endOfPeriod = endOfDay(yesterday);
      break;
    case 'week':
      const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }); // Monday of last week
      startOfPeriod = lastWeekStart;
      endOfPeriod = endOfWeek(lastWeekStart, { weekStartsOn: 1 }); // Sunday of last week
      break;
    case 'month':
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      startOfPeriod = lastMonthStart;
      endOfPeriod = endOfMonth(lastMonthStart);
      break;
    case 'quarter':
      const lastQuarterStart = startOfQuarter(subQuarters(now, 1));
      startOfPeriod = lastQuarterStart;
      endOfPeriod = endOfQuarter(lastQuarterStart);
      break;
    default: 
      const yesterdayDefault = subDays(now, 1);
      startOfPeriod = startOfDay(yesterdayDefault);
      endOfPeriod = endOfDay(yesterdayDefault);
      break;
  }
  return { 
    startDate: format(startOfPeriod, "yyyy-MM-dd'T'HH:mm:ss"), 
    endDate: format(endOfPeriod, "yyyy-MM-dd'T'HH:mm:ss") 
  };
}

export async function fetchPeriodForwardingSummary(aggregationPeriod: string): Promise<{ maxPaymentForwardedSats: number; totalFeesEarnedSats: number; paymentsForwardedCount: number; }> {
  if (!bigquery || !datasetId) {
    console.error("BigQuery client not initialized or datasetId missing for fetchPeriodForwardingSummary.");
    return { maxPaymentForwardedSats: 0, totalFeesEarnedSats: 0, paymentsForwardedCount: 0 };
  }
  
  const { startDate, endDate } = getPeriodDateRange(aggregationPeriod);

  const query = `
    SELECT
      MAX(out_msat) as max_payment_msat,
      SUM(fee_msat) as total_fees_msat,
      COUNT(*) as payments_count
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
      paymentsForwardedCount: Number(result.payments_count || 0),
    };
  } catch (error) {
    logBigQueryError(`fetchPeriodForwardingSummary (aggregation: ${aggregationPeriod})`, error);
    return { maxPaymentForwardedSats: 0, totalFeesEarnedSats: 0, paymentsForwardedCount: 0 };
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
