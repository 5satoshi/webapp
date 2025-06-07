
'use server';

import type { KeyMetric, TimeSeriesData, Channel } from '@/lib/types';
import { BigQuery, type BigQueryTimestamp } from '@google-cloud/bigquery';
import { format } from 'date-fns';

// Ensure these environment variables are set in your .env file or deployment environment
const projectId = process.env.BIGQUERY_PROJECT_ID;
const datasetId = process.env.BIGQUERY_DATASET_ID;

let bigquery: BigQuery | undefined;

if (projectId && datasetId) {
  try {
    bigquery = new BigQuery({ projectId });
  } catch (error) {
    console.error("Failed to initialize BigQuery client:", error);
    // Depending on your error handling strategy, you might want to throw here
    // or allow the app to continue with other services potentially failing.
  }
} else {
  console.warn("BIGQUERY_PROJECT_ID or BIGQUERY_DATASET_ID is not set. BigQuery functionality will be disabled.");
}

// Helper to convert BigQueryTimestamp to 'YYYY-MM-DD' string
function formatDateFromBQ(timestamp: BigQueryTimestamp | string | Date): string {
  if (typeof timestamp === 'string' || timestamp instanceof Date) {
    // If it's already a string like 'YYYY-MM-DD' or a Date object
     if (typeof timestamp === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(timestamp)) {
        return timestamp;
    }
    return format(new Date(timestamp), 'yyyy-MM-dd');
  }
  // Assuming BigQueryTimestamp has a 'value' property which is a string like '2023-10-27T10:30:00.000Z'
  // or a Date object. The exact structure might vary based on how BQ returns it.
  // Adjust if necessary based on the actual type of `timestamp.value`.
  if (timestamp && typeof timestamp.value === 'string') {
     // If the value is already in YYYY-MM-DD format from a DATE type in BQ
    if (/^\d{4}-\d{2}-\d{2}$/.test(timestamp.value)) {
        return timestamp.value;
    }
    // Otherwise, parse it as a full timestamp
    return format(new Date(timestamp.value), 'yyyy-MM-dd');
  }
  // Fallback for unexpected format
  console.warn("Unexpected BigQueryTimestamp format:", timestamp);
  return format(new Date(), 'yyyy-MM-dd'); // Default to today if formatting fails
}


export async function fetchKeyMetrics(): Promise<KeyMetric[]> {
  if (!bigquery || !datasetId) {
    console.error("BigQuery client not initialized or datasetId missing. Returning empty metrics.");
    // Fallback to empty or mock data if BigQuery is not configured
    return [
        { id: 'payments', title: 'Total Payments Processed', value: 'N/A', iconName: 'Zap' },
        { id: 'fees', title: 'Forwarding Fees Earned (sats)', value: 'N/A', iconName: 'Activity' },
        { id: 'active_channels', title: 'Active Channels', value: 'N/A', iconName: 'Network' },
        { id: 'connected_peers', title: 'Connected Peers', value: 'N/A', iconName: 'Users' },
    ];
  }

  // --- Total Payments Processed ---
  // Assumes `forwardings` table with `status` column ('settled', 'failed', etc.)
  const paymentsQuery = `
    SELECT COUNT(*) as total_payments
    FROM \`${projectId}.${datasetId}.forwardings\`
    WHERE status = 'settled'
  `;

  // --- Forwarding Fees Earned (sats) ---
  // Assumes `forwardings` table with `fee_msat` column (in millisatoshis)
  const feesQuery = `
    SELECT SUM(fee_msat) as total_fees_msat
    FROM \`${projectId}.${datasetId}.forwardings\`
    WHERE status = 'settled'
  `;

  // --- Active Channels ---
  // Assumes `channels` table with `state` column (e.g., 'CHANNELD_NORMAL' for active in c-lightning)
  // Adjust 'CHANNELD_NORMAL' if your active state has a different name.
  const activeChannelsQuery = `
    SELECT COUNT(*) as active_channels
    FROM \`${projectId}.${datasetId}.channels\`
    WHERE state = 'CHANNELD_NORMAL'
  `;
  
  // --- Connected Peers ---
  // Assumes `peers` table with `connected` column (boolean)
  const connectedPeersQuery = `
    SELECT COUNT(*) as connected_peers
    FROM \`${projectId}.${datasetId}.peers\`
    WHERE connected = TRUE
  `;

  try {
    const [paymentsJob] = await bigquery.createQueryJob({ query: paymentsQuery });
    const [feesJob] = await bigquery.createQueryJob({ query: feesQuery });
    const [activeChannelsJob] = await bigquery.createQueryJob({ query: activeChannelsQuery });
    const [connectedPeersJob] = await bigquery.createQueryJob({ query: connectedPeersQuery });

    const [[paymentsResult]] = await paymentsJob.getQueryResults();
    const [[feesResult]] = await feesJob.getQueryResults();
    const [[activeChannelsResult]] = await activeChannelsJob.getQueryResults();
    const [[connectedPeersResult]] = await connectedPeersJob.getQueryResults();
    
    const totalPayments = paymentsResult?.total_payments || 0;
    const totalFeesMsat = feesResult?.total_fees_msat || 0;
    const activeChannels = activeChannelsResult?.active_channels || 0;
    const connectedPeers = connectedPeersResult?.connected_peers || 0;

    // Convert fees from msat to sat
    const totalFeesSats = Math.floor(Number(totalFeesMsat) / 1000);

    return [
      { id: 'payments', title: 'Total Payments Processed', value: Number(totalPayments), iconName: 'Zap' },
      { id: 'fees', title: 'Forwarding Fees Earned (sats)', value: totalFeesSats, iconName: 'Activity' },
      { id: 'active_channels', title: 'Active Channels', value: Number(activeChannels), iconName: 'Network' },
      { id: 'connected_peers', title: 'Connected Peers', value: Number(connectedPeers), iconName: 'Users' },
    ];

  } catch (error) {
    console.error("Error fetching key metrics from BigQuery:", error);
    // Return mock or placeholder data in case of error
    return [
        { id: 'payments', title: 'Total Payments Processed', value: 'Error', iconName: 'Zap' },
        { id: 'fees', title: 'Forwarding Fees Earned (sats)', value: 'Error', iconName: 'Activity' },
        { id: 'active_channels', title: 'Active Channels', value: 'Error', iconName: 'Network' },
        { id: 'connected_peers', title: 'Connected Peers', value: 'Error', iconName: 'Users' },
    ];
  }
}

export async function fetchHistoricalPaymentVolume(): Promise<TimeSeriesData[]> {
  if (!bigquery || !datasetId) {
    console.error("BigQuery client not initialized or datasetId missing. Returning empty time series.");
    return [];
  }

  // --- Historical Payment Volume ---
  // Assumes `forwardings` table with `received_time` (TIMESTAMP) and `out_msat` (forwarded amount in msat)
  // Fetches data for the last 30 days.
  const query = `
    SELECT
      DATE(received_time) AS day,
      SUM(out_msat) AS total_volume_msat
    FROM \`${projectId}.${datasetId}.forwardings\`
    WHERE status = 'settled'
      AND received_time IS NOT NULL
      AND received_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
    GROUP BY day
    ORDER BY day ASC
  `;
  
  try {
    const [job] = await bigquery.createQueryJob({ query: query });
    const [rows] = await job.getQueryResults();

    return rows.map(row => ({
      date: formatDateFromBQ(row.day), 
      value: Math.floor(Number(row.total_volume_msat) / 1000), // Convert msat to sat
    }));

  } catch (error) {
    console.error("Error fetching historical payment volume from BigQuery:", error);
    return []; // Return empty array on error
  }
}

// Maps c-lightning channel states to simplified statuses
function mapChannelStatus(state: string): Channel['status'] {
  // Based on c-lightning states
  if (state === 'CHANNELD_NORMAL') {
    return 'active';
  }
  if (['CHANNELD_AWAITING_LOCKIN', 'DUALOPEND_AWAITING_LOCKIN', 'OPENINGD'].includes(state)) {
    return 'pending';
  }
  // Consider other states like 'CLOSINGD_SIGEXCHANGE', 'CLOSINGD_COMPLETE', 'ONCHAIN' as inactive
  return 'inactive';
}

export async function fetchChannels(): Promise<Channel[]> {
  if (!bigquery || !datasetId) {
    console.error("BigQuery client not initialized or datasetId missing. Returning empty channel list.");
    return [];
  }

  // Assumes 'channels' table with c-lightning like fields
  // 'id' here is assumed to be the unique channel identifier (e.g., channel_id hex)
  // 'state' is the c-lightning channel state string
  // 'msatoshi_total', 'msatoshi_to_us'
  const query = `
    SELECT
      id, 
      peer_id AS peerNodeId,
      msatoshi_total,
      msatoshi_to_us,
      state,
      -- Additional fields like short_channel_id could be queried if needed for display
      FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%SZ', CURRENT_TIMESTAMP()) as retrieved_at 
      -- last_update from the source would be better if available
    FROM \`${projectId}.${datasetId}.channels\`
    ORDER BY state, peer_id
  `;

  try {
    const [job] = await bigquery.createQueryJob({ query: query });
    const [rows] = await job.getQueryResults();

    return rows.map(row => {
      const status = mapChannelStatus(row.state);
      const capacity = Math.floor(Number(row.msatoshi_total) / 1000);
      const localBalance = Math.floor(Number(row.msatoshi_to_us) / 1000);
      const remoteBalance = capacity - localBalance; // Simplified calculation

      // Placeholders for uptime and success rate
      let uptime = 0;
      let historicalPaymentSuccessRate = 0;
      if (status === 'active') {
        uptime = 100; // Placeholder
        historicalPaymentSuccessRate = 99; // Placeholder
      } else if (status === 'pending') {
        uptime = 50; // Placeholder
      }


      return {
        id: row.id, // Ensure this is a string
        peerNodeId: row.peerNodeId,
        capacity: capacity,
        localBalance: localBalance,
        remoteBalance: remoteBalance,
        status: status,
        uptime: uptime, 
        historicalPaymentSuccessRate: historicalPaymentSuccessRate,
        lastUpdate: row.retrieved_at, // Using retrieval time as placeholder for lastUpdate
      };
    });

  } catch (error) {
    console.error("Error fetching channels from BigQuery:", error);
    return []; // Return empty array on error
  }
}
