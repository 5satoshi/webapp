
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
  drain?: number | null; // Calculated as log((in_share + epsilon) / (out_share + epsilon))
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
  transactionCount?: number; // Changed back from successRate
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

export interface ForwardingAmountDistributionData {
  range: string; 
  frequency: number;
}

export interface ForwardingValueOverTimeData {
  date: string;
  medianValue: number;
  maxValue: number;
}

export interface NetworkSubsumptionData {
  date: string; // YYYY-MM-DD
  micro: number;  // Percentage value for micro tx
  common: number; // Percentage value for common tx
  macro: number;  // Percentage value for macro tx
}

export interface HeatmapCell {
  day: number; // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
  hour: number; // 0-23
  successfulForwards: number;
  failedForwards: number;
}

export interface TopNodeSubsumptionEntry {
  nodeid: string;
  alias?: string | null;
  micro_share: number | null;
  micro_rank: number | null;
  common_share: number | null;
  common_rank: number | null;
  macro_share: number | null;
  macro_rank: number | null;
}

export interface SingleCategoryTopNode {
  nodeid: string;
  alias?: string | null;
  categoryShare: number | null; // Share for the specific category this card represents
  categoryRank: number | null;  // Rank for the specific category this card represents

  // Full details for tooltip
  microShare: number | null;
  microRank: number | null;
  commonShare: number | null;
  commonRank: number | null;
  macroShare: number | null;
  macroRank: number | null;
}

export interface AllTopNodes {
  micro: SingleCategoryTopNode[];
  common: SingleCategoryTopNode[];
  macro: SingleCategoryTopNode[];
}


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
  totalTxCount: number; // Total successful transactions involving this channel

  // Incoming stats (towards our node via this channel)
  inTxCount: number; // Successful incoming
  inTxVolumeSats: number;
  inSuccessRate: number;
  
  // Outgoing stats (from our node via this channel)
  outTxCount: number; // Successful outgoing
  outTxVolumeSats: number;
  outSuccessRate: number;

  // Fees earned by our node & our node's policy for this channel
  totalFeesEarnedSats: number; // Total fees earned when this channel was the outgoing hop for our node
  ourAdvertisedPolicy: string | null; // Our node's advertised fee policy for this channel (e.g., "X msat + Y ppm")
}


export interface OurNodeCategoryRank {
  latestRank: number | null;
  rankChange: number | null; // Positive means rank got worse (higher number), negative means better
  latestShare: number | null;
  previousShare: number | null;
}

export interface OurNodeRanksForAllCategories {
  micro: OurNodeCategoryRank;
  common: OurNodeCategoryRank;
  macro: OurNodeCategoryRank;
}

export interface NodeDisplayInfo {
  nodeId: string;
  alias?: string | null;
}

export interface GraphNode {
  id: string;
  name: string; // Alias or formatted ID
  val: number; // for node size
  isCentralNode: boolean;
  color?: string; // Optional: for specific node coloring
}

export interface GraphLink {
  source: string; // Node ID
  target: string; // Node ID
  value: number;  // shortest_path_share, influencing link width or appearance
}

export interface NodeGraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}
