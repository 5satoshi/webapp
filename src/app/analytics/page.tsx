
import Link from 'next/link';
import { PageTitle } from '@/components/ui/page-title';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { aggregationPeriodOptions } from '@/lib/mock-data';
import { Separator } from '@/components/ui/separator';

import { PaymentAmountChart } from '@/components/dashboard/analytics/payment-amount-chart';
import { TimingHeatmap } from '@/components/dashboard/analytics/timing-heatmap';

import {
  fetchForwardingAmountDistribution,
  fetchMedianAndMaxForwardingValueOverTime,
  fetchTimingHeatmapData,
} from '@/services/analyticsService';
import { headers } from 'next/headers';


export default async function AnalyticsPage({
  params,
  searchParams
}: {
  params: {}; 
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  headers(); // Opt into dynamic rendering

  const aggregationParam = searchParams.aggregation;
  let currentAggregation = (typeof aggregationParam === 'string' ? aggregationParam : undefined) || aggregationPeriodOptions[1].value; // Default to 'week'
  if (!aggregationPeriodOptions.some(opt => opt.value === currentAggregation)) {
    currentAggregation = aggregationPeriodOptions[1].value; // Ensure it's a valid option, default to 'week'
  }

  const forwardingDistributionData = await fetchForwardingAmountDistribution(currentAggregation);
  const forwardingValueData = await fetchMedianAndMaxForwardingValueOverTime(currentAggregation);
  const timingHeatmapData = await fetchTimingHeatmapData(currentAggregation);

  let chartTitlePeriodLabel = 'Last 4 Weeks';
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
      <PageTitle
        title="Network Insights"
        description="We can learn something from our node about the usage of the overall network, how much and when the network is used."
      />

      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="font-headline">Volume &amp; Timing Analysis</CardTitle>
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
          <p className="text-sm text-muted-foreground mb-4">
            Understanding the routed payment amounts for the {chartTitlePeriodLabel.toLowerCase()} is crucial. We present two insights: first, the distribution of payment amounts, and second, the evolution of median and maximum payment values over this period.
          </p>
          <PaymentAmountChart
            distributionData={forwardingDistributionData}
            forwardingValueData={forwardingValueData}
            frequencyChartTitleLabel={chartTitlePeriodLabel}
            aggregationPeriod={currentAggregation}
          />

          <Separator />

          <div>
            <h3 className="text-xl font-semibold mb-2 font-headline text-center md:text-left">
              Timing Patterns Heatmap ({chartTitlePeriodLabel})
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              What can be analyzed are the timestamps of transaction requests hitting the node. If we put the timestamps for the received routing requests of the {chartTitlePeriodLabel.toLowerCase()} with our Lightning node in a weekly heatmap, we get the following overview in Coordinated Universal Time (UTC).
            </p>
            <TimingHeatmap data={timingHeatmapData} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
