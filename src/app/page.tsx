
import Link from 'next/link';
import { PageTitle } from '@/components/ui/page-title';
import { KeyMetricsCard } from '@/components/dashboard/overview/key-metrics-card';
import { SampleOverviewChart } from '@/components/dashboard/overview/sample-overview-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { aggregationPeriodOptions } from '@/lib/mock-data'; 
import { 
  fetchKeyMetrics, 
  fetchHistoricalPaymentVolume,
  fetchPeriodForwardingSummary,
  fetchPeriodChannelActivity,
  fetchBetweennessRank,
  fetchShortestPathShare
} from '@/services/nodeService';
import type { KeyMetric, BetweennessRankData, ShortestPathShareData } from '@/lib/types';
import { getOrdinalSuffix } from '@/lib/utils';


export default async function OverviewPage({ 
  searchParams 
}: { 
  searchParams?: { aggregation?: string } 
}) {
  
  let currentAggregation = searchParams?.aggregation || 'day'; 
  if (!aggregationPeriodOptions.some(opt => opt.value === currentAggregation)) {
    currentAggregation = 'day'; 
  }

  const keyMetrics = await fetchKeyMetrics();
  const historicalPaymentVolume = await fetchHistoricalPaymentVolume(currentAggregation);
  // const forwardingSummary = await fetchPeriodForwardingSummary(currentAggregation); // Replaced by shortestPathShare
  const channelActivity = await fetchPeriodChannelActivity(currentAggregation);
  const betweennessRankData = await fetchBetweennessRank(currentAggregation);
  const shortestPathShareData = await fetchShortestPathShare(currentAggregation);
  
  let descriptiveLabel = 'Day';
  switch (currentAggregation) {
    case 'day':
      descriptiveLabel = 'Day';
      break;
    case 'week':
      descriptiveLabel = '7 Days';
      break;
    case 'month':
      descriptiveLabel = '30 Days';
      break;
    case 'quarter':
      descriptiveLabel = '90 Days';
      break;
    default:
      descriptiveLabel = 'Period'; 
      break;
  }

  const shortestPathShareLatest = shortestPathShareData.latestShare;
  const shortestPathSharePrevious = shortestPathShareData.previousShare;
  const shortestPathDisplayValue = shortestPathShareLatest !== null 
    ? `${(shortestPathShareLatest * 100).toFixed(3)}%` 
    : 'N/A';
  let shortestPathAbsoluteChange: number | undefined = undefined;
  if (shortestPathShareLatest !== null && shortestPathSharePrevious !== null) {
    shortestPathAbsoluteChange = parseFloat(((shortestPathShareLatest - shortestPathSharePrevious) * 100).toFixed(3));
  }

  const periodMetrics: KeyMetric[] = [
    {
      id: 'betweenness_rank',
      title: `Betweenness Rank`,
      displayValue: betweennessRankData.latestRank !== null ? `${betweennessRankData.latestRank}${getOrdinalSuffix(betweennessRankData.latestRank)}` : 'N/A',
      iconName: 'LineChart',
      absoluteChange: (betweennessRankData.latestRank !== null && betweennessRankData.previousRank !== null) 
                      ? betweennessRankData.latestRank - betweennessRankData.previousRank 
                      : undefined,
      absoluteChangeDescription: `vs previous`,
      description: `Node's current betweenness centrality rank. Lower is better. Change shown vs prior period.`,
    },
    {
      id: 'shortest_path_share',
      title: `Shortest Path Share (last ${descriptiveLabel})`,
      displayValue: shortestPathDisplayValue,
      iconName: 'PieChart',
      absoluteChange: shortestPathAbsoluteChange,
      absoluteChangeDescription: `% vs previous`,
      description: `Expected fraction of routing attempts using this node for common payments.`,
    },
    {
      id: 'payments_forwarded_period',
      title: `Payments Forwarded (last ${descriptiveLabel})`,
      displayValue: (await fetchPeriodForwardingSummary(currentAggregation)).paymentsForwardedCount.toLocaleString(), // Fetching here for simplicity
      unit: 'Payments',
      iconName: 'Zap',
      description: `Total payments successfully forwarded in the last ${descriptiveLabel.toLowerCase()}.`,
    },
    {
      id: 'channel_changes_period',
      title: `Channel Changes (last ${descriptiveLabel})`,
      displayValue: `${channelActivity.openedCount} / ${channelActivity.closedCount}`,
      unit: 'Opened / Closed',
      iconName: 'Network',
      description: `Channels opened vs closed in the last ${descriptiveLabel.toLowerCase()}.`,
    },
  ];

  return (
    <div className="space-y-6">
      <PageTitle title="Node Overview" description="Key performance indicators and trends for your Lightning node." />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {keyMetrics.map((metric) => (
          <KeyMetricsCard key={metric.id} metric={metric} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="font-headline">Historical Payment Volume & Period Activity</CardTitle>
            <Tabs value={currentAggregation} className="w-full sm:w-auto">
              <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:grid-cols-4">
                {aggregationPeriodOptions.map(option => (
                  <TabsTrigger key={option.value} value={option.value} asChild>
                    <Link href={`/?aggregation=${option.value}`}>{option.label}</Link>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <SampleOverviewChart data={historicalPaymentVolume} aggregationPeriod={currentAggregation} />
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {periodMetrics.map((metric) => (
              <KeyMetricsCard key={metric.id} metric={metric} />
            ))}
          </div>
        </CardContent>
      </Card>
      
    </div>
  );
}
