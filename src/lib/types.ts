export interface KeyMetric {
  id: string;
  title: string;
  value: string | number;
  iconName: 'Zap' | 'Activity' | 'Clock' | 'Network' | 'BarChart3' | 'PieChart' | 'LineChart' | 'Users'; // Added 'Users'
  description?: string;
  trend?: number; // Optional: for showing percentage change
}

export interface Channel {
  id: string;
  peerNodeId: string;
  capacity: number; // in satoshis
  localBalance: number; // in satoshis
  remoteBalance: number; // in satoshis
  uptime: number; // percentage
  historicalPaymentSuccessRate: number; // percentage
  lastUpdate: string;
  status: 'active' | 'inactive' | 'pending';
}

export interface AlertSetting {
  id: string;
  metric: string;
  threshold: number;
  condition: 'above' | 'below';
  notificationChannel: 'email' | 'sms' | 'app'; // Simplified
  isEnabled: boolean;
}

export interface TimeSeriesData {
  date: string; // Should be in 'YYYY-MM-DD' format
  value: number;
  [key: string]: any; // For multiple lines in a chart
}

export interface FeeDistributionData {
  type: 'remote' | 'local';
  ppm: number;
}

export interface RoutingActivityData {
  month: string;
  count: number;
}

export interface DailyRoutingVolumeData {
  date: string;
  volume: number;
}

export interface PaymentAmountDistributionData {
  range: string; // e.g., "0-1k sats"
  frequency: number;
}

export interface AveragePaymentValueData {
  date: string;
  averageValue: number;
}

export interface NetworkSubsumptionData {
  date: string;
  micro: number; // percentage for 200 sats
  common: number; // percentage for 50,000 sats
  macro: number; // percentage for 4,000,000 sats
}

export interface HeatmapCell {
  day: number; // 0 (Sun) - 6 (Sat) or 0 (Mon) - 6 (Sun)
  hour: number; // 0-23
  intensity: number; // 0-1, represents traffic intensity
}

export interface Recommendation {
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
}

// AI Input Data for string fields
export type AiStructuredInput = {
  totalPaymentsProcessed: number;
  forwardingFeesEarned: number;
  nodeUptime: number; // This might be harder to get from BQ, consider if this is still the best metric name
  numberOfChannels: number;
  historicalRoutingData: string; // JSON string or descriptive text
  feeDistributionData: string; // JSON string or descriptive text
  routingActivityData: string; // JSON string or descriptive text
  paymentAmountDistributionData: string; // JSON string or descriptive text
  networkSubsumptionMetricsData: string; // JSON string or descriptive text
  timingPatternsHeatmapData: string; // JSON string or descriptive text
};
