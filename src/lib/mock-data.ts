
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
  AiStructuredInput,
} from './types';
// Icons are no longer directly in mock data for KeyMetric, but iconName strings are used.

export const mockKeyMetrics: KeyMetric[] = [
  { id: 'payments', title: 'Total Payments Processed', value: 12560, iconName: 'Zap', trend: 5.2 },
  { id: 'fees', title: 'Forwarding Fees Earned (sats)', value: 853020, iconName: 'Activity', trend: 12.1 },
  { id: 'uptime', title: 'Node Uptime', value: '99.98%', iconName: 'Clock', trend: 0.01 },
  { id: 'channels', title: 'Active Channels', value: 78, iconName: 'Network', trend: -2 },
];

export const mockChannels: Channel[] = [
  { id: '1', peerNodeId: '02_alpha_node_long_id_string', capacity: 5000000, localBalance: 2000000, remoteBalance: 3000000, uptime: 99.5, historicalPaymentSuccessRate: 98.2, lastUpdate: '2023-10-26T10:00:00Z', status: 'active' },
  { id: '2', peerNodeId: '03_beta_node_other_id_string', capacity: 10000000, localBalance: 7000000, remoteBalance: 3000000, uptime: 99.9, historicalPaymentSuccessRate: 99.1, lastUpdate: '2023-10-26T11:00:00Z', status: 'active' },
  { id: '3', peerNodeId: '02_gamma_node_test_id_string', capacity: 2000000, localBalance: 500000, remoteBalance: 1500000, uptime: 95.0, historicalPaymentSuccessRate: 90.5, lastUpdate: '2023-10-25T09:00:00Z', status: 'inactive' },
  { id: '4', peerNodeId: '03_delta_node_another_id_val', capacity: 20000000, localBalance: 10000000, remoteBalance: 10000000, uptime: 100, historicalPaymentSuccessRate: 99.7, lastUpdate: '2023-10-26T12:00:00Z', status: 'active' },
];

export const mockAlertSettings: AlertSetting[] = [
  { id: '1', metric: 'Node Uptime', threshold: 99, condition: 'below', notificationChannel: 'email', isEnabled: true },
  { id: '2', metric: 'Channel Balance (any)', threshold: 100000, condition: 'below', notificationChannel: 'sms', isEnabled: true },
  { id: '3', metric: 'Forwarding Fees (daily)', threshold: 50000, condition: 'above', notificationChannel: 'app', isEnabled: false },
];

const generateTimeSeries = (days: number, startValue: number, fluctuation: number): TimeSeriesData[] => {
  const data: TimeSeriesData[] = [];
  let currentDate = new Date();
  currentDate.setDate(currentDate.getDate() - days);
  for (let i = 0; i < days; i++) {
    data.push({
      date: currentDate.toISOString().split('T')[0],
      value: Math.max(0, startValue + (Math.random() - 0.5) * fluctuation * (i / 5)),
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return data;
};

export const mockHistoricalPaymentVolume: TimeSeriesData[] = generateTimeSeries(30, 500000, 100000);

export const mockFeeDistributionData: FeeDistributionData[] = [
  { type: 'remote', ppm: 150 },
  { type: 'local', ppm: 50 },
];

export const mockRoutingActivityData: RoutingActivityData[] = Array.from({ length: 12 }, (_, i) => {
  const monthDate = new Date();
  monthDate.setMonth(monthDate.getMonth() - (11 - i));
  return {
    month: monthDate.toLocaleString('default', { month: 'short' }),
    count: Math.floor(Math.random() * 5000) + 1000,
  };
});

export const mockDailyRoutingVolumeData: DailyRoutingVolumeData[] = Array.from({ length: 42 }, (_, i) => { // 6 weeks
  const dayDate = new Date();
  dayDate.setDate(dayDate.getDate() - (41 - i));
  return {
    date: dayDate.toISOString().split('T')[0],
    volume: Math.floor(Math.random() * 1000000) + 200000,
  };
});

export const mockPaymentAmountDistributionData: PaymentAmountDistributionData[] = [
  { range: '0-1k', frequency: 1200 },
  { range: '1k-10k', frequency: 800 },
  { range: '10k-50k', frequency: 450 },
  { range: '50k-200k', frequency: 200 },
  { range: '200k-1M', frequency: 80 },
  { range: '>1M', frequency: 30 },
];

export const mockAveragePaymentValueData: AveragePaymentValueData[] = generateTimeSeries(30, 25000, 5000).map(d => ({date: d.date, averageValue: d.value}));


export const mockNetworkSubsumptionData: NetworkSubsumptionData[] = Array.from({ length: 30 }, (_, i) => {
  const dayDate = new Date();
  dayDate.setDate(dayDate.getDate() - (29 - i));
  return {
    date: dayDate.toISOString().split('T')[0],
    micro: Math.floor(Math.random() * 30) + 60, // 60-90%
    common: Math.floor(Math.random() * 20) + 40, // 40-60%
    macro: Math.floor(Math.random() * 15) + 10, // 10-25%
  };
});


export const mockTimingPatternsHeatmapData: HeatmapCell[] = [];
const daysOfWeek = 7; // Mon-Sun
const hoursOfDay = 24;
for (let day = 0; day < daysOfWeek; day++) {
  for (let hour = 0; hour < hoursOfDay; hour++) {
    // Simulate higher traffic during business hours and evenings, lower at night
    let intensity = Math.random() * 0.3; // Base intensity
    if (hour >= 9 && hour <= 17) intensity += Math.random() * 0.4; // Daytime
    if (hour >= 18 && hour <= 22) intensity += Math.random() * 0.3; // Evening
    if (day >= 0 && day <= 4) intensity += Math.random() * 0.2; // Weekdays
    mockTimingPatternsHeatmapData.push({
      day,
      hour,
      intensity: Math.min(1, intensity),
    });
  }
}

export const mockAiInput: AiStructuredInput = {
  totalPaymentsProcessed: 12560, // From mockKeyMetrics
  forwardingFeesEarned: 853020, // From mockKeyMetrics
  nodeUptime: 99.98, // From mockKeyMetrics
  numberOfChannels: 78, // From mockKeyMetrics
  historicalRoutingData: "Over the past month, the node routed 15,000 payments with an average success rate of 97.5%. Peak routing times were weekdays 14:00-17:00 UTC. Average fee per successful route: 3.5 sats.",
  feeDistributionData: "Current median remote channel fee: 150ppm, local channel fee: 50ppm. 80% of revenue comes from remote channels. Trend shows increasing remote fees over last 3 months.",
  routingActivityData: "Monthly routing count peaked at 5,200 in July, current month at 4,800. Daily routing volume averages 500,000 sats, with spikes up to 1.5M sats on high-activity days.",
  paymentAmountDistributionData: "Most frequent payments (60%) are micro-payments (<1k sats). Payments between 1k-50k sats account for 30%. Large payments (>200k sats) are infrequent but contribute significantly to volume. Average payment value is trending slightly upwards from 22k sats to 28k sats over the last quarter.",
  networkSubsumptionMetricsData: "Node is the cheapest route for 85% of micro payments (200 sats), 55% for common payments (50k sats), and 15% for macro payments (4M sats). Subsumption for common payments has slightly decreased in the last week.",
  timingPatternsHeatmapData: "Highest traffic intensity observed on weekdays between 10:00-12:00 UTC and 14:00-17:00 UTC. Weekend traffic is generally lower but shows a small peak on Saturday afternoons."
};

export const aggregationPeriodOptions = [
  { value: 'day', label: 'Days' },
  { value: 'week', label: 'Weeks' },
  { value: 'month', label: 'Months' },
  { value: 'quarter', label: 'Quarters' },
];

// Original timescaleOptions, kept for reference or other charts if needed
export const timescaleOptions = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
  { value: '1y', label: '1 Year' },
  { value: 'all', label: 'All Time' },
];
