
import type { BigQueryTimestamp, BigQueryDatetime } from '@google-cloud/bigquery';
import {
  format,
  startOfWeek, startOfMonth, startOfQuarter,
  endOfDay, endOfWeek, endOfMonth, endOfQuarter,
  parseISO,
  subDays, subWeeks, subMonths, subQuarters, startOfDay
} from 'date-fns';
import type { Channel } from './types';

export function logBigQueryError(context: string, error: any) {
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
  if (error.message && error.message.includes("Could not refresh access token")) {
    console.error("This 'Could not refresh access token' error often indicates an issue with the service account credentials (GOOGLE_APPLICATION_CREDENTIALS), its permissions (IAM roles for BigQuery), or that the BigQuery API is not enabled for the project.");
  }
   if (error.message && error.message.includes("User does not have bigquery.jobs.create permission")) {
    console.error("Hint: This 'bigquery.jobs.create permission' error means the authenticated identity needs the 'BigQuery User' (roles/bigquery.user) IAM role in the project.");
  }
}

export function formatTimestampFromBQValue(timestampValue: string | null | undefined): string | null {
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


export function formatDateFromBQ(timestamp: BigQueryTimestamp | BigQueryDatetime | string | Date | { value: string }): string {
  if (!timestamp) {
    console.warn("formatDateFromBQ received null or undefined timestamp. Returning today's date as fallback.");
    return format(new Date(), 'yyyy-MM-dd');
  }

  let dateToFormat: Date;

  if (typeof (timestamp as { value: string }).value === 'string') {
    const bqValue = (timestamp as { value: string }).value;
    if (/^\\d{4}-\\d{2}-\\d{2}$/.test(bqValue)) { // Date string YYYY-MM-DD
        dateToFormat = parseISO(bqValue + 'T00:00:00Z'); // Assume UTC start of day for date-only strings
    } else { // Full timestamp string
        dateToFormat = parseISO(bqValue);
    }
  } else if (typeof timestamp === 'string') {
     if (/^\\d{4}-\\d{2}-\\d{2}$/.test(timestamp)) { // Date string YYYY-MM-DD
        dateToFormat = parseISO(timestamp + 'T00:00:00Z'); // Assume UTC start of day
    } else { // Full timestamp string
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

export function mapChannelStatus(state: string | null | undefined): Channel['status'] {
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
      console.warn(`Unknown channel state encountered in mapChannelStatus: ${state}. Defaulting to 'inactive'.`);
      return 'inactive';
  }
}

export function getPeriodDateRange(aggregationPeriod: string): { startDate: string, endDate: string } {
  const now = new Date();
  // For most queries, we look at data up to the end of *yesterday*
  // to ensure data completeness, as some data might arrive with a delay.
  const yesterday = endOfDay(subDays(now, 1)); 
  let startOfPeriod: Date;

  switch (aggregationPeriod.toLowerCase()) {
    case 'day': // Represents "Last 1 Day" or "Yesterday"
      startOfPeriod = startOfDay(subDays(now, 1));
      break;
    case 'week': // Represents "Last 7 Days"
      startOfPeriod = startOfDay(subDays(now, 7)); // Inclusive of today, back 7 days
      break;
    case 'month': // Represents "Last 30 Days"
      startOfPeriod = startOfDay(subDays(now, 30));
      break;
    case 'quarter': // Represents "Last 90 Days"
      startOfPeriod = startOfDay(subDays(now, 90));
      break;
    default: // Fallback to "Yesterday"
      console.warn(`Unknown aggregation period "${aggregationPeriod}" in getPeriodDateRange. Defaulting to 'day'.`);
      startOfPeriod = startOfDay(subDays(now, 1));
      break;
  }
  return {
    startDate: format(startOfPeriod, "yyyy-MM-dd'T'HH:mm:ssXXX"), // Using ISO format with timezone offset
    endDate: format(yesterday, "yyyy-MM-dd'T'HH:mm:ssXXX")
  };
}
