'use server';

import type { ForwardingAmountDistributionData, ForwardingValueOverTimeData, HeatmapCell } from '@/lib/types';
import { getBigQueryClient, ensureBigQueryClientInitialized, projectId, datasetId } from './bigqueryClient';
import { formatDateFromBQ, getPeriodDateRange, logBigQueryError } from '@/lib/bigqueryUtils';
import { format, subDays, subMonths, startOfDay, endOfDay } from 'date-fns';

export async function fetchForwardingAmountDistribution(aggregationPeriod: string): Promise<ForwardingAmountDistributionData[]> {
  await ensureBigQueryClientInitialized();
  const bigquery = getBigQueryClient();
  
  if (!bigquery) {
    logBigQueryError("fetchForwardingAmountDistribution", new Error("BigQuery client not available."));
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
  await ensureBigQueryClientInitialized();
  const bigquery = getBigQueryClient();

  if (!bigquery) {
    logBigQueryError("fetchMedianAndMaxForwardingValueOverTime", new Error("BigQuery client not available."));
    return [];
  }

  let dateGroupingExpression = "";
  let limit = 20; 

  switch (aggregationPeriod.toLowerCase()) {
    case 'week':
      dateGroupingExpression = "DATE_TRUNC(DATE(received_time), WEEK(MONDAY))";
      limit = 12; 
      break;
    case 'month':
      dateGroupingExpression = "DATE_TRUNC(DATE(received_time), MONTH)";
      limit = 12; 
      break;
    case 'quarter':
      dateGroupingExpression = "DATE_TRUNC(DATE(received_time), QUARTER)";
      limit = 8; 
      break;
    case 'day':
    default:
      dateGroupingExpression = "DATE(received_time)";
      limit = 30; 
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
  await ensureBigQueryClientInitialized();
  const bigquery = getBigQueryClient();

  if (!bigquery) {
    logBigQueryError("fetchTimingHeatmapData", new Error("BigQuery client not available."));
    return [];
  }

  let queryStartDate: string;
  const now = new Date();
  const effectiveEndDate = endOfDay(subDays(now, 1)); 

  switch (aggregationPeriod.toLowerCase()) {
    case 'day': 
      queryStartDate = format(startOfDay(subDays(effectiveEndDate, 6)), "yyyy-MM-dd'T'HH:mm:ssXXX");
      break;
    case 'week': 
      queryStartDate = format(startOfDay(subDays(effectiveEndDate, (4 * 7) - 1)), "yyyy-MM-dd'T'HH:mm:ssXXX");
      break;
    case 'month': 
      queryStartDate = format(startOfDay(subMonths(startOfDay(effectiveEndDate), 3-1)), "yyyy-MM-dd'T'HH:mm:ssXXX");
      break;
    case 'quarter': 
      queryStartDate = format(startOfDay(subMonths(startOfDay(effectiveEndDate), 12-1)), "yyyy-MM-dd'T'HH:mm:ssXXX");
      break;
    default: 
      queryStartDate = format(startOfDay(subDays(effectiveEndDate, 6)), "yyyy-MM-dd'T'HH:mm:ssXXX");
      break;
  }
  const queryEndDate = format(effectiveEndDate, "yyyy-MM-dd'T'HH:mm:ssXXX");


  const query = `
    SELECT
      EXTRACT(DAYOFWEEK FROM received_time) - 1 AS day_of_week, 
      EXTRACT(HOUR FROM received_time) AS hour_of_day,    
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

    