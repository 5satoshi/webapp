
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
  fetchPeriodChannelActivity
} from '@/services/nodeService';
import type { KeyMetric } from '@/lib/types';


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
  const forwardingSummary = await fetchPeriodForwardingSummary(currentAggregation);
  const channelActivity = await fetchPeriodChannelActivity(currentAggregation);
  const currentAggregationLabel = aggregationPeriodOptions.find(opt => opt.value === currentAggregation)?.label.toLowerCase() || 'period';


  const periodMetrics: KeyMetric[] = [
    {
      id: 'max_payment_period',
      title: `Max Payment Forwarded (last ${currentAggregationLabel})`,
      displayValue: (forwardingSummary.maxPaymentForwardedSats / 100000000).toFixed(3),
      unit: 'BTC',
      iconName: 'BarChart3',
    },
    {
      id: 'fees_earned_period',
      title: `Fees Earned (last ${currentAggregationLabel})`,
      displayValue: forwardingSummary.totalFeesEarnedSats.toLocaleString(),
      unit: 'sats',
      iconName: 'Activity',
    },
    {
      id: 'payments_forwarded_period',
      title: `Payments Forwarded (last ${currentAggregationLabel})`,
      displayValue: forwardingSummary.paymentsForwardedCount.toLocaleString(),
      unit: 'Payments',
      iconName: 'Zap',
    },
    {
      id: 'channel_changes_period',
      title: `Channel Changes (last ${currentAggregationLabel})`,
      displayValue: `${channelActivity.openedCount} / ${channelActivity.closedCount}`,
      unit: 'Opened / Closed',
      iconName: 'Network',
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
