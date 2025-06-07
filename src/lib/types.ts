
export interface KeyMetric {
  id: string;
  title: string;
  displayValue: string; // Changed from 'value'
  unit?: string;          // New optional field for units
  iconName: 'Zap' | 'Activity' | 'Clock' | 'Network' | 'BarChart3' | 'PieChart' | 'LineChart' | 'Users';
  description?: string;
  trend?: number; 
}

export interface Channel {
  id: string;
  peerNodeId: string;
  capacity: number; 
  localBalance: number; 
  remoteBalance: number; 
  uptime: number; 
  historicalPaymentSuccessRate: number; 
  lastUpdate: string;
  status: 'active' | 'inactive' | 'pending';
}

export interface AlertSetting {
  id: string;
  metric: string;
  threshold: number;
  condition: 'above' | 'below';
  notificationChannel: 'email' | 'sms' | 'app'; 
  isEnabled: boolean;
}

export interface TimeSeriesData {
  date: string; 
  paymentVolume: number; 
  transactionCount?: number;
  [key: string]: any; 
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
  range: string; 
  frequency: number;
}

export interface AveragePaymentValueData {
  date: string;
  averageValue: number;
}

export interface NetworkSubsumptionData {
  date: string;
  micro: number; 
  common: number; 
  macro: number; 
}

export interface HeatmapCell {
  day: number; 
  hour: number; 
  intensity: number; 
}

export interface Recommendation {
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
}

export type AiStructuredInput = {
  totalPaymentsProcessed: number;
  forwardingFeesEarned: number;
  nodeUptime: number; 
  numberOfChannels: number;
  historicalRoutingData: string; 
  feeDistributionData: string; 
  routingActivityData: string; 
  paymentAmountDistributionData: string; 
  networkSubsumptionMetricsData: string; 
  timingPatternsHeatmapData: string; 
};

