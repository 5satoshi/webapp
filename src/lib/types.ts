
export interface KeyMetric {
  id: string;
  title: string;
  displayValue: string;
  unit?: string;
  iconName: 'Zap' | 'Activity' | 'Clock' | 'Network' | 'BarChart3' | 'PieChart' | 'LineChart' | 'Users';
  description?: string;
  trend?: number; 
  absoluteChange?: number;
  absoluteChangeDescription?: string;
  absoluteChangeDirection?: 'higher_is_better' | 'lower_is_better';
}

export interface Channel {
  id: string; // Typically funding_txid:funding_outnum
  shortChannelId: string | null; // The short channel ID from the peers table
  peerNodeId: string;
  peerAlias?: string; 
  capacity: number; 
  localBalance: number; 
  remoteBalance: number; 
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
  forwardingVolume: number; 
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

export interface BetweennessRankData {
  latestRank: number | null;
  previousRank: number | null;
}

export interface ShortestPathShareData {
  latestShare: number | null;
  previousShare: number | null;
}

export interface ChannelDetails {
  shortChannelId: string;
  firstTxTimestamp: string | null;
  lastTxTimestamp: string | null;
  totalTxCount: number;
  inTxCount: number;
  outTxCount: number;
  inTxVolumeSats: number;
  outTxVolumeSats: number;
  inSuccessRate: number;
  outSuccessRate: number;
  totalFeesEarnedSats: number; // Total fees earned when this channel was the outgoing hop
  avgOutboundFeePpm: number | null; // Avg fee rate (ppm) when this channel was outgoing
  avgInboundFeePpm: number | null; // Avg fee rate (ppm) on forwards that used this channel as incoming
}

