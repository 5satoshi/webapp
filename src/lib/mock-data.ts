
import type {
  KeyMetric,
  Channel,
  AlertSetting,
  TimeSeriesData,
  FeeDistributionData,
  RoutingActivityData,
  DailyRoutingVolumeData,
  PaymentAmountDistributionData,
  AveragePaymentValueData,
  NetworkSubsumptionData,
  HeatmapCell,
} from './types';

export const aggregationPeriodOptions = [
  { value: 'day', label: 'Days' },
  { value: 'week', label: 'Weeks' },
  { value: 'month', label: 'Months' },
  { value: 'quarter', label: 'Quarters' },
];
