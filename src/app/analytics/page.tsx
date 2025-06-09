
import Link from 'next/link';
import { PageTitle } from '@/components/ui/page-title';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { aggregationPeriodOptions } from '@/lib/mock-data';

import { PaymentAmountChart } from '@/components/dashboard/analytics/payment-amount-chart'; // Will be renamed to ForwardingAmountChart conceptually
import { TimingHeatmap } from '@/components/dashboard/analytics/timing-heatmap';

import { 
  fetchForwardingAmountDistribution,
  fetchAverageForwardingValueOverTime,
  fetchTimingHeatmapData,
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
  const averageForwardingValueData = await fetchAverageForwardingValueOverTime(currentAggregation);
  const timingHeatmapData = await fetchTimingHeatmapData();


  return (
    <div className="space-y-6">
      <PageTitle title="Node Analytics" description="Deep dive into your node's performance metrics and trends." />

      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="font-headline">Forwarding Amount Insights</CardTitle>
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
        <CardContent>
          <PaymentAmountChart
            distributionData={forwardingDistributionData} 
            averageValueData={averageForwardingValueData} 
          />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Timing Patterns Heatmap (Last 8 Weeks)</CardTitle>
        </CardHeader>
        <CardContent>
          <TimingHeatmap data={timingHeatmapData} />
        </CardContent>
      </Card>
    </div>
  );
}
