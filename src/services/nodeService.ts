
'use server';

import type { KeyMetric, TimeSeriesData, Channel } from '@/lib/types';
import { BigQuery, type BigQueryTimestamp, type BigQueryDatetime } from '@google-cloud/bigquery';
import { format } from 'date-fns';

const projectId = process.env.BIGQUERY_PROJECT_ID;
const datasetId = process.env.BIGQUERY_DATASET_ID;

let bigquery: BigQuery | undefined;

if (projectId && datasetId) {
  try {
    console.log(`Initializing BigQuery client with projectId: ${projectId}, datasetId: ${datasetId}`);
    bigquery = new BigQuery({ projectId });
    console.log("BigQuery client initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize BigQuery client:", error);
  }
} else {
  console.warn("BIGQUERY_PROJECT_ID or BIGQUERY_DATASET_ID is not set in environment variables. BigQuery functionality will be impaired.");
}

function formatDateFromBQ(timestamp: BigQueryTimestamp | BigQueryDatetime | string | Date | { value: string }): string {
  console.log("formatDateFromBQ received:", JSON.stringify(timestamp));
  if (!timestamp) {
    console.warn("formatDateFromBQ received null or undefined timestamp. Returning today's date as fallback.");
    return format(new Date(), 'yyyy-MM-dd');
  }

  let dateToFormat: Date;

  if (typeof (timestamp as { value: string }).value === 'string') {
    // Handles BigQueryTimestamp, BigQueryDate, BigQueryDatetime, BigQueryTime objects
    const bqValue = (timestamp as { value: string }).value;
    // Check if it's just a date string (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(bqValue)) {
        // For BigQuery DATE type, append a time to make it a valid Date constructor input
        dateToFormat = new Date(bqValue + 'T00:00:00');
    } else {
        dateToFormat = new Date(bqValue);
    }
  } else if (typeof timestamp === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(timestamp)) {
        dateToFormat = new Date(timestamp + 'T00:00:00');
    } else {
        dateToFormat = new Date(timestamp);
    }
  } else if (timestamp instanceof Date) {
    dateToFormat = timestamp;
  } else {
    console.warn("Unexpected date format in formatDateFromBQ. Received:", timestamp, "Returning today's date as fallback.");
    dateToFormat = new Date();
  }
  
  if (isNaN(dateToFormat.getTime())) {
    console.warn("Failed to parse date in formatDateFromBQ. Original value:", timestamp, "Returning today's date as fallback.");
    return format(new Date(), 'yyyy-MM-dd');
  }
  
  return format(dateToFormat, 'yyyy-MM-dd');
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
    FROM \`${projectId}.${datasetId}.channels\`
    WHERE active = TRUE
  `;
  const connectedPeersQuery = `
    SELECT COUNT(DISTINCT peer_id) as connected_peers 
    FROM \`${projectId}.${datasetId}.channels\` 
    WHERE active = TRUE
  `;
  // Note: The connected_peers query above assumes peers involved in active channels are "connected"
  // If you have a separate 'peers' table with a 'connected' status, that would be more accurate.
  // For now, using the distinct peer IDs from active channels as a proxy.

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

export async function fetchHistoricalPaymentVolume(): Promise<TimeSeriesData[]> {
  if (!bigquery || !datasetId) {
    console.error("BigQuery client not initialized or datasetId missing for fetchHistoricalPaymentVolume. Returning empty time series.");
    return [];
  }
  console.log(`Fetching historical payment volume from BigQuery...`);

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

    return rows.map(row => {
      if (!row || row.day === null || row.day === undefined) {
        console.warn("Skipping row with null/undefined date in historical payment volume:", JSON.stringify(row));
        return null; 
      }
      return {
        date: formatDateFromBQ(row.day), 
        value: Math.floor(Number(row.total_volume_msat || 0) / 1000), 
      };
    }).filter(item => item !== null) as TimeSeriesData[];

  } catch (error) {
    console.error("Error fetching historical payment volume from BigQuery:", error);
    return []; 
  }
}

export async function fetchChannels(): Promise<Channel[]> {
  if (!bigquery || !datasetId) {
    console.error("BigQuery client not initialized or datasetId missing for fetchChannels. Returning empty channel list.");
    return [];
  }
  console.log(`Fetching channels from BigQuery based on new schema...`);

  // Query adapted to the new schema provided by the user
  const query = `
    SELECT
      short_channel_id, 
      source,
      destination, -- Assuming 'destination' is the peer node ID
      amount_msat, -- Assuming this is channel capacity
      active,
      last_update -- DATETIME field for last update
    FROM \`${projectId}.${datasetId}.channels\`
    ORDER BY active DESC, short_channel_id
  `;

  try {
    console.log("Executing channels query:", query);
    const [job] = await bigquery.createQueryJob({ query: query });
    const [rows] = await job.getQueryResults();
    console.log("Raw channels rows from new schema:", JSON.stringify(rows, null, 2));

    if (!rows || rows.length === 0) {
        console.log("No channel data returned from BigQuery for new schema.");
        return [];
    }

    return rows.map(row => {
      const capacitySats = Math.floor(Number(row.amount_msat || 0) / 1000);
      // Placeholder for local/remote balance as it's not in the provided schema
      const localBalanceSats = Math.floor(capacitySats / 2);
      const remoteBalanceSats = capacitySats - localBalanceSats;
      
      const status: Channel['status'] = row.active === true ? 'active' : 'inactive';

      // Placeholders for uptime and success rate
      let uptime = 0;
      let historicalPaymentSuccessRate = 0;
      if (status === 'active') {
        uptime = 100; // Placeholder
        historicalPaymentSuccessRate = 99; // Placeholder
      }

      return {
        id: String(row.short_channel_id || `unknown-id-${Math.random()}`), 
        peerNodeId: String(row.destination || 'unknown-peer-id'), // Assumption: destination is the peer
        capacity: capacitySats,
        localBalance: localBalanceSats,
        remoteBalance: remoteBalanceSats,
        status: status,
        uptime: uptime, 
        historicalPaymentSuccessRate: historicalPaymentSuccessRate,
        lastUpdate: row.last_update ? formatDateFromBQ(row.last_update) : new Date().toISOString().split('T')[0],
      };
    });

  } catch (error) {
    console.error("Error fetching channels from BigQuery (new schema):", error);
    return []; 
  }
}
