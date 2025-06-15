
'use server';

import type { Channel, ChannelDetails } from '@/lib/types';
import { getBigQueryClient, ensureBigQueryClientInitialized, projectId, datasetId } from './bigqueryClient';
import { formatTimestampFromBQValue, mapChannelStatus, logBigQueryError } from '@/lib/bigqueryUtils';

export async function fetchChannels(): Promise<Channel[]> {
  try {
    await ensureBigQueryClientInitialized();
  } catch (initError: any) {
    logBigQueryError("fetchChannels (client initialization)", initError);
    return [];
  }
  const bigquery = getBigQueryClient();

  if (!bigquery) {
    logBigQueryError("fetchChannels", new Error("BigQuery client not available."));
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
        uptime: 0, 
      };
    });

  } catch (error) {
    logBigQueryError("fetchChannels (query execution)", error);
    return [];
  }
}

export async function fetchChannelDetails(shortChannelId: string): Promise<ChannelDetails | null> {
  const defaultReturn: ChannelDetails | null = null; // Or a default structure if preferred
  try {
    await ensureBigQueryClientInitialized();
  } catch (initError: any) {
    logBigQueryError(`fetchChannelDetails (client initialization, ID: ${shortChannelId})`, initError);
    return defaultReturn;
  }
  const bigquery = getBigQueryClient();


  if (!bigquery || !shortChannelId) {
    logBigQueryError("fetchChannelDetails", new Error(`BigQuery client not available or shortChannelId not provided (ID: ${shortChannelId}).`));
    return defaultReturn;
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
       console.warn(`No channel details found for shortChannelId: ${shortChannelId}. Returning default structure.`);
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
    logBigQueryError(`fetchChannelDetails (query execution, shortChannelId: ${shortChannelId})`, error);
    return defaultReturn;
  }
}

    
