
'use server';

import type { KeyMetric, TimeSeriesData, Channel } from '@/lib/types';
import { BigQuery, type BigQueryTimestamp, type BigQueryDatetime } from '@google-cloud/bigquery';
import { format } from 'date-fns';

const projectId = process.env.BIGQUERY_PROJECT_ID || 'lightning-fee-optimizer';
const datasetId = process.env.BIGQUERY_DATASET_ID || 'version_1';

let bigquery: BigQuery | undefined;

try {
  console.log(`Initializing BigQuery client with projectId: ${projectId}, datasetId: ${datasetId}`);
  bigquery = new BigQuery({ projectId });
  console.log("BigQuery client initialized successfully.");
} catch (error) {
  console.error("Failed to initialize BigQuery client:", error);
}

function formatDateFromBQ(timestamp: BigQueryTimestamp | BigQueryDatetime | string | Date | { value: string }): string {
  console.log("formatDateFromBQ received:", JSON.stringify(timestamp));
  if (!timestamp) {
    console.warn("formatDateFromBQ received null or undefined timestamp. Returning today's date as fallback.");
    return format(new Date(), 'yyyy-MM-dd');
  }

  let dateToFormat: Date;

  if (typeof (timestamp as { value: string }).value === 'string') {
    const bqValue = (timestamp as { value: string }).value;
    // Check if it's already just a date string like 'YYYY-MM-DD' from DATE()
    if (/^\d{4}-\d{2}-\d{2}$/.test(bqValue)) {
        dateToFormat = new Date(bqValue + 'T00:00:00Z'); // Assume UTC if only date
    } else {
        dateToFormat = new Date(bqValue); // Assume full timestamp string
    }
  } else if (typeof timestamp === 'string') {
     if (/^\d{4}-\d{2}-\d{2}$/.test(timestamp)) {
        dateToFormat = new Date(timestamp + 'T00:00:00Z'); // Assume UTC
    } else {
        dateToFormat = new Date(timestamp);
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

// Map c-lightning channel states to UI-friendly statuses
function mapChannelStatus(state: string | null | undefined): Channel['status'] {
  if (!state) return 'inactive';
  // Based on https://lightning.readthedocs.io/lightning-listpeers.7.html#states
  switch (state.toUpperCase()) {
    case 'OPENINGD':
    case 'CHANNELD_AWAITING_LOCKIN':
    case 'DUALOPEND_OPEN_INIT': // From listpeers
    case 'DUALOPEND_AWAITING_LOCKIN': // From listpeers
      return 'pending';
    case 'CHANNELD_NORMAL':
      return 'active';
    case 'CHANNELD_SHUTTING_DOWN':
    case 'CLOSINGD_SIGEXCHANGE':
    case 'CLOSINGD_COMPLETE':
    case 'AWAITING_UNILATERAL':
    case 'FUNDING_SPEND_SEEN':
    case 'ONCHAIN':
      return 'inactive'; 
    default:
      console.warn(`Unknown channel state: ${state}, defaulting to inactive.`);
      return 'inactive';
  }
}

export async function fetchKeyMetrics(): Promise<KeyMetric[]> {
  if (!bigquery || !datasetId) {
    console.error("BigQuery client not initialized or datasetId missing for fetchKeyMetrics. Returning N/A metrics.");
    return [
        { id: 'payments', title: 'Total Payments Processed', value: 'N/A', iconName: 'Zap' },
        { id: 'fees', title: 'Forwarding Fees Earned (sats)', value: 'N/A', iconName: 'Activity' },
        { id: 'active_channels', title: 'Active Channels', value: 'N/A', iconName: 'Network' },
        { id: 'connected_peers', title: 'Connected Peers', value: 'N/A', iconName: 'Users' },
    ];
  }

  console.log(`Fetching key metrics from BigQuery...`);

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
    WHERE state = 'CHANNELD_NORMAL' 
  `;
  const connectedPeersQuery = `
    SELECT COUNT(DISTINCT id) as connected_peers 
    FROM \`${projectId}.${datasetId}.peers\` 
    WHERE state = 'CHANNELD_NORMAL'
  `;
  
  try {
    console.log("Executing paymentsQuery:", paymentsQuery);
    const [paymentsJob] = await bigquery.createQueryJob({ query: paymentsQuery });
    const [[paymentsResult]] = await paymentsJob.getQueryResults();
    console.log("Raw paymentsResult:", JSON.stringify(paymentsResult));

    console.log("Executing feesQuery:", feesQuery);
    const [feesJob] = await bigquery.createQueryJob({ query: feesQuery });
    const [[feesResult]] = await feesJob.getQueryResults();
    console.log("Raw feesResult:", JSON.stringify(feesResult));

    console.log("Executing activeChannelsQuery:", activeChannelsQuery);
    const [activeChannelsJob] = await bigquery.createQueryJob({ query: activeChannelsQuery });
    const [[activeChannelsResult]] = await activeChannelsJob.getQueryResults();
    console.log("Raw activeChannelsResult:", JSON.stringify(activeChannelsResult));
    
    console.log("Executing connectedPeersQuery:", connectedPeersQuery);
    const [connectedPeersJob] = await bigquery.createQueryJob({ query: connectedPeersQuery });
    const [[connectedPeersResult]] = await connectedPeersJob.getQueryResults();
    console.log("Raw connectedPeersResult:", JSON.stringify(connectedPeersResult));
    
    const totalPayments = Number(paymentsResult?.total_payments || 0);
    const totalFeesMsat = Number(feesResult?.total_fees_msat || 0);
    const activeChannels = Number(activeChannelsResult?.active_channels || 0);
    const connectedPeers = Number(connectedPeersResult?.connected_peers || 0);

    const totalFeesSats = Math.floor(totalFeesMsat / 1000);

    console.log("Processed Key Metrics:", { totalPayments, totalFeesSats, activeChannels, connectedPeers });

    return [
      { id: 'payments', title: 'Total Payments Processed', value: totalPayments, iconName: 'Zap' },
      { id: 'fees', title: 'Forwarding Fees Earned (sats)', value: totalFeesSats, iconName: 'Activity' },
      { id: 'active_channels', title: 'Active Channels', value: activeChannels, iconName: 'Network' },
      { id: 'connected_peers', title: 'Connected Peers', value: connectedPeers, iconName: 'Users' },
    ];

  } catch (error) {
    console.error("Error fetching key metrics from BigQuery:", error);
    return [
        { id: 'payments', title: 'Total Payments Processed', value: 'Error', iconName: 'Zap' },
        { id: 'fees', title: 'Forwarding Fees Earned (sats)', value: 'Error', iconName: 'Activity' },
        { id: 'active_channels', title: 'Active Channels', value: 'Error', iconName: 'Network' },
        { id: 'connected_peers', title: 'Connected Peers', value: 'Error', iconName: 'Users' },
    ];
  }
}

export async function fetchHistoricalPaymentVolume(timescale: string = '30d'): Promise<TimeSeriesData[]> {
  if (!bigquery || !datasetId) {
    console.error("BigQuery client not initialized or datasetId missing for fetchHistoricalPaymentVolume. Returning empty time series.");
    return [];
  }
  console.log(`Fetching historical payment volume from BigQuery for timescale: ${timescale}...`);

  let intervalClause = "";
  let dateGroupingExpression = "DATE(received_time)";

  switch (timescale) {
    case '7d':
      intervalClause = "AND received_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)";
      break;
    case '30d':
      intervalClause = "AND received_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)";
      break;
    case '90d':
      intervalClause = "AND received_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)";
      break;
    case '1y':
      intervalClause = "AND received_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 YEAR)";
      dateGroupingExpression = "DATE_TRUNC(DATE(received_time), WEEK)";
      break;
    case 'all':
      // No interval clause for 'all', fetch all data
      dateGroupingExpression = "DATE_TRUNC(DATE(received_time), WEEK)"; // Group by week for 'all' to manage data points
      break;
    default:
      console.warn(`Unsupported timescale: ${timescale}, defaulting to 30d.`);
      intervalClause = "AND received_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)";
  }

  const query = `
    SELECT
      ${dateGroupingExpression} AS date_group,
      SUM(out_msat) AS total_volume_msat
    FROM \`${projectId}.${datasetId}.forwardings\`
    WHERE status = 'settled'
      AND received_time IS NOT NULL
      ${intervalClause}
    GROUP BY date_group
    ORDER BY date_group ASC
  `;
  
  try {
    console.log("Executing historicalPaymentVolume query:", query);
    const [job] = await bigquery.createQueryJob({ query: query });
    const [rows] = await job.getQueryResults();
    console.log("Raw historicalPaymentVolume rows:", JSON.stringify(rows, null, 2));

    if (!rows || rows.length === 0) {
        console.log("No historical payment volume data returned from BigQuery for timescale:", timescale);
        return [];
    }

    const formattedRows = rows.map(row => {
      if (!row || row.date_group === null || row.date_group === undefined) {
        console.warn("Skipping row with null/undefined date_group in historical payment volume:", JSON.stringify(row));
        return null; 
      }
      return {
        date: formatDateFromBQ(row.date_group), 
        value: Math.floor(Number(row.total_volume_msat || 0) / 1000), 
      };
    }).filter(item => item !== null);
    
    console.log(`Formatted historical payment volume for ${timescale}:`, JSON.stringify(formattedRows, null, 2));
    return formattedRows as TimeSeriesData[];

  } catch (error) {
    console.error(`Error fetching historical payment volume for timescale ${timescale} from BigQuery:`, error);
    return []; 
  }
}

export async function fetchChannels(): Promise<Channel[]> {
  if (!bigquery || !datasetId) {
    console.error("BigQuery client not initialized or datasetId missing for fetchChannels. Returning empty channel list.");
    return [];
  }
  console.log(`Fetching channels from BigQuery 'peers' table...`);

  const query = `
    SELECT
      id,                  -- Peer's public key
      funding_txid,
      funding_outnum,
      msatoshi_total,
      msatoshi_to_us,
      state                -- Channel state
    FROM \`${projectId}.${datasetId}.peers\`
    ORDER BY state, id
  `;

  try {
    console.log("Executing channels query on 'peers' table:", query);
    const [job] = await bigquery.createQueryJob({ query: query });
    const [rows] = await job.getQueryResults();
    console.log("Raw channels rows from 'peers' table:", JSON.stringify(rows, null, 2));

    if (!rows || rows.length === 0) {
        console.log("No channel data returned from BigQuery 'peers' table.");
        return [];
    }

    return rows.map(row => {
      const msatTotal = Number(row.msatoshi_total || 0);
      const msatToUs = Number(row.msatoshi_to_us || 0);
      
      const capacitySats = Math.floor(msatTotal / 1000);
      const localBalanceSats = Math.floor(msatToUs / 1000);
      const remoteBalanceSats = Math.floor((msatTotal - msatToUs) / 1000);
      
      // Create a unique channel ID from funding_txid and funding_outnum if available
      const channelId = (row.funding_txid && row.funding_outnum !== null && row.funding_outnum !== undefined) 
                        ? `${row.funding_txid}:${row.funding_outnum}` 
                        : `peer-${row.id}-${Math.random().toString(36).substring(7)}`; // Fallback if no funding info

      return {
        id: channelId, 
        peerNodeId: String(row.id || 'unknown-peer-id'),
        capacity: capacitySats,
        localBalance: localBalanceSats,
        remoteBalance: remoteBalanceSats,
        status: mapChannelStatus(row.state),
        uptime: mapChannelStatus(row.state) === 'active' ? 100 : 90, // Placeholder
        historicalPaymentSuccessRate: mapChannelStatus(row.state) === 'active' ? 99 : 95, // Placeholder
        lastUpdate: new Date().toISOString(), // Placeholder for last_update
      };
    });

  } catch (error) {
    console.error("Error fetching channels from BigQuery 'peers' table:", error);
    return []; 
  }
}

    