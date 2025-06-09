
import Link from 'next/link';
import { PageTitle } from '@/components/ui/page-title';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { aggregationPeriodOptions } from '@/lib/mock-data';
import { Separator } from '@/components/ui/separator';

import { PaymentAmountChart } from '@/components/dashboard/analytics/payment-amount-chart';
import { TimingHeatmap } from '@/components/dashboard/analytics/timing-heatmap';
// import { RoutingActivityChart } from '@/components/dashboard/analytics/routing-activity-chart'; // Removed

import { 
  fetchForwardingAmountDistribution,
  fetchMedianAndMaxForwardingValueOverTime,
  fetchTimingHeatmapData,
  // fetchMonthlyRoutingCount, // Removed
  // fetchDailyRoutingVolume, // Removed
} from '@/services/nodeService';


export default async function AnalyticsPage({ 
  searchParams 
}: { 
  searchParams?: { aggregation?: string } 
}) {
  
  let currentAggregation = searchParams?.aggregation || aggregationPeriodOptions[0].value;
  if (!aggregationPeriodOptions.some(opt => opt.value === currentAggregation)) {
    currentAggregation = aggregationPeriodOptions[0].value;
  }

  const forwardingDistributionData = await fetchForwardingAmountDistribution(currentAggregation);
  const forwardingValueData = await fetchMedianAndMaxForwardingValueOverTime(currentAggregation);
  const timingHeatmapData = await fetchTimingHeatmapData(currentAggregation);
  // const monthlyRoutingCountData = await fetchMonthlyRoutingCount(); // Removed
  // const dailyRoutingVolumeData = await fetchDailyRoutingVolume(); // Removed

  let chartTitlePeriodLabel = 'Last 7 Days'; // Default for 'day'
  const selectedOption = aggregationPeriodOptions.find(opt => opt.value === currentAggregation);

  if (selectedOption) {
    switch (currentAggregation) {
      case 'day':
        chartTitlePeriodLabel = 'Last 7 Days';
        break;
      case 'week':
        chartTitlePeriodLabel = 'Last 4 Weeks';
        break;
      case 'month':
        chartTitlePeriodLabel = 'Last 3 Months';
        break;
      case 'quarter':
        chartTitlePeriodLabel = 'Last 12 Months';
        break;
      default:
        chartTitlePeriodLabel = `Last ${selectedOption.label}`; 
        break;
    }
  }

  return (
    <div className="space-y-6">
      <PageTitle title="Node Analytics" description="Deep dive into your node's performance metrics and trends." />

      {/* Routing Activity Trends Card Removed */}
      {/* 
      <Card>
        <CardHeader>
            <CardTitle className="font-headline">Routing Activity Trends</CardTitle>
            <CardDescription className="text-sm text-muted-foreground pt-1">
              Now, let’s have look at the number of payments we’ve routed through our node over time. We’re displaying two interesting metrics, the long-term trend, showing the last year per month and the short term trend, each day of the last 6 weeks.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <RoutingActivityChart 
                monthlyCountData={monthlyRoutingCountData} 
                dailyVolumeData={dailyVolumeData} 
            />
        </CardContent>
      </Card> 
      */}

      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="font-headline">Forwarding &amp; Timing Analysis</CardTitle>
                <Tabs value={currentAggregation} className="w-full sm:w-auto">
                <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:grid-cols-4">
                    {aggregationPeriodOptions.map(option => (
                    <TabsTrigger key={option.value} value={option.value} asChild>
                        <Link href={`/analytics?aggregation=${option.value}`}>{option.label}</Link>
                    </TabsTrigger>
                    ))}
                </TabsList>
                </Tabs>
            </div>
        </CardHeader>
        <CardContent className="space-y-8">
          <PaymentAmountChart
            distributionData={forwardingDistributionData} 
            forwardingValueData={forwardingValueData}
            frequencyChartTitleLabel={chartTitlePeriodLabel}
          />
        
          <Separator />

          <div>
            <h3 className="text-xl font-semibold mb-2 font-headline text-center md:text-left">
              Timing Patterns Heatmap ({chartTitlePeriodLabel})
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              What can be analyzed are the timestamps of transaction requests hitting the node. If we put the timestamps for the received routing requests of the last 8 weeks with our Lightning node in a weekly heatmap, we get the following overview in Coordinated Universal Time (UTC).
            </p>
            <TimingHeatmap data={timingHeatmapData} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
