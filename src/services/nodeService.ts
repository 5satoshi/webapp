
'use server';

import type { KeyMetric, TimeSeriesData, Channel } from '@/lib/types';
import { BigQuery, type BigQueryTimestamp } from '@google-cloud/bigquery';
import { format } from 'date-fns';

const projectId = process.env.BIGQUERY_PROJECT_ID || 'lightning-fee-optimizer';
const datasetId = process.env.BIGQUERY_DATASET_ID || 'version_1';

let bigquery: BigQuery | undefined;

if (projectId && datasetId) {
  try {
    console.log(`Initializing BigQuery client with projectId: ${projectId}`);
    bigquery = new BigQuery({ projectId });
    console.log("BigQuery client initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize BigQuery client:", error);
  }
} else {
  console.warn("BIGQUERY_PROJECT_ID or BIGQUERY_DATASET_ID is not set in environment variables. Using hardcoded fallback values. BigQuery functionality might be impaired if these are incorrect.");
}

function formatDateFromBQ(timestamp: BigQueryTimestamp | string | Date | { value: string }): string {
  console.log("formatDateFromBQ received:", timestamp);
  if (typeof timestamp === 'string') {
    // If it's already a string like 'YYYY-MM-DD'
    if (/^\d{4}-\d{2}-\d{2}$/.test(timestamp)) {
        return timestamp;
    }
    // Otherwise, assume it's a full timestamp string
    return format(new Date(timestamp), 'yyyy-MM-dd');
  }
  if (timestamp instanceof Date) {
    return format(timestamp, 'yyyy-MM-dd');
  }
  // Handling BigQueryTimestamp or similar objects with a 'value' property
  if (timestamp && typeof (timestamp as { value: string }).value === 'string') {
    const dateValue = (timestamp as { value: string }).value;
     // If the value is already in YYYY-MM-DD format from a DATE type in BQ
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue;
    }
    // Otherwise, parse it as a full timestamp string
    return format(new Date(dateValue), 'yyyy-MM-dd');
  }
  console.warn("Unexpected date format in formatDateFromBQ. Received:", timestamp, "Returning today's date as fallback.");
  return format(new Date(), 'yyyy-MM-dd');
}


export async function fetchKeyMetrics(): Promise<KeyMetric[]> {
  if (!bigquery || !datasetId) {
    console.error("BigQuery client not initialized or datasetId missing for fetchKeyMetrics. Returning empty metrics.");
    return [
        { id: 'payments', title: 'Total Payments Processed', value: 'N/A', iconName: 'Zap' },
        { id: 'fees', title: 'Forwarding Fees Earned (sats)', value: 'N/A', iconName: 'Activity' },
        { id: 'active_channels', title: 'Active Channels', value: 'N/A', iconName: 'Network' },
        { id: 'connected_peers', title: 'Connected Peers', value: 'N/A', iconName: 'Users' },
    ];
  }

  console.log(`Fetching key metrics from BigQuery: ${projectId}.${datasetId}`);

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
    FROM \`${projectId}.${datasetId}.channels\`
    WHERE state = 'CHANNELD_NORMAL'
  `;
  const connectedPeersQuery = `
    SELECT COUNT(*) as connected_peers
    FROM \`${projectId}.${datasetId}.peers\`
    WHERE connected = TRUE
  `;

  try {
    console.log("Executing paymentsQuery:", paymentsQuery);
    const [paymentsJob] = await bigquery.createQueryJob({ query: paymentsQuery });
    const [[paymentsResult]] = await paymentsJob.getQueryResults();
    console.log("Raw paymentsResult:", paymentsResult);

    console.log("Executing feesQuery:", feesQuery);
    const [feesJob] = await bigquery.createQueryJob({ query: feesQuery });
    const [[feesResult]] = await feesJob.getQueryResults();
    console.log("Raw feesResult:", feesResult);

    console.log("Executing activeChannelsQuery:", activeChannelsQuery);
    const [activeChannelsJob] = await bigquery.createQueryJob({ query: activeChannelsQuery });
    const [[activeChannelsResult]] = await activeChannelsJob.getQueryResults();
    console.log("Raw activeChannelsResult:", activeChannelsResult);
    
    console.log("Executing connectedPeersQuery:", connectedPeersQuery);
    const [connectedPeersJob] = await bigquery.createQueryJob({ query: connectedPeersQuery });
    const [[connectedPeersResult]] = await connectedPeersJob.getQueryResults();
    console.log("Raw connectedPeersResult:", connectedPeersResult);
    
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

export async function fetchHistoricalPaymentVolume(): Promise<TimeSeriesData[]> {
  if (!bigquery || !datasetId) {
    console.error("BigQuery client not initialized or datasetId missing for fetchHistoricalPaymentVolume. Returning empty time series.");
    return [];
  }
  console.log(`Fetching historical payment volume from BigQuery: ${projectId}.${datasetId}`);

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
    console.log("Executing historicalPaymentVolume query:", query);
    const [job] = await bigquery.createQueryJob({ query: query });
    const [rows] = await job.getQueryResults();
    console.log("Raw historicalPaymentVolume rows:", JSON.stringify(rows, null, 2));

    if (!rows || rows.length === 0) {
        console.log("No historical payment volume data returned from BigQuery.");
        return [];
    }

    return rows.map(row => ({
      date: formatDateFromBQ(row.day), 
      value: Math.floor(Number(row.total_volume_msat || 0) / 1000), 
    }));

  } catch (error) {
    console.error("Error fetching historical payment volume from BigQuery:", error);
    return []; 
  }
}

function mapChannelStatus(state: string): Channel['status'] {
  if (!state) return 'inactive'; // Default if state is null or undefined
  if (state === 'CHANNELD_NORMAL') {
    return 'active';
  }
  if (['CHANNELD_AWAITING_LOCKIN', 'DUALOPEND_AWAITING_LOCKIN', 'OPENINGD'].includes(state)) {
    return 'pending';
  }
  return 'inactive';
}

export async function fetchChannels(): Promise<Channel[]> {
  if (!bigquery || !datasetId) {
    console.error("BigQuery client not initialized or datasetId missing for fetchChannels. Returning empty channel list.");
    return [];
  }
  console.log(`Fetching channels from BigQuery: ${projectId}.${datasetId}`);

  const query = `
    SELECT
      id, 
      peer_id AS peerNodeId,
      msatoshi_total,
      msatoshi_to_us,
      state,
      FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%SZ', CURRENT_TIMESTAMP()) as retrieved_at 
    FROM \`${projectId}.${datasetId}.channels\`
    ORDER BY state, peer_id
  `;

  try {
    console.log("Executing channels query:", query);
    const [job] = await bigquery.createQueryJob({ query: query });
    const [rows] = await job.getQueryResults();
    console.log("Raw channels rows:", JSON.stringify(rows, null, 2));

    if (!rows || rows.length === 0) {
        console.log("No channel data returned from BigQuery.");
        return [];
    }

    return rows.map(row => {
      const status = mapChannelStatus(row.state);
      const capacity = Math.floor(Number(row.msatoshi_total || 0) / 1000);
      const localBalance = Math.floor(Number(row.msatoshi_to_us || 0) / 1000);
      const remoteBalance = capacity - localBalance; 

      let uptime = 0;
      let historicalPaymentSuccessRate = 0;
      if (status === 'active') {
        uptime = 100; 
        historicalPaymentSuccessRate = 99; 
      } else if (status === 'pending') {
        uptime = 50; 
      }

      return {
        id: String(row.id || 'unknown-id'), 
        peerNodeId: String(row.peerNodeId || 'unknown-peer-id'),
        capacity: capacity,
        localBalance: localBalance,
        remoteBalance: remoteBalance,
        status: status,
        uptime: uptime, 
        historicalPaymentSuccessRate: historicalPaymentSuccessRate,
        lastUpdate: row.retrieved_at || new Date().toISOString(),
      };
    });

  } catch (error) {
    console.error("Error fetching channels from BigQuery:", error);
    return []; 
  }
}

    