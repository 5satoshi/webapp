
import Link from 'next/link';
import { PageTitle } from '@/components/ui/page-title';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { aggregationPeriodOptions } from '@/lib/mock-data';

import { PaymentAmountChart } from '@/components/dashboard/analytics/payment-amount-chart';
import { TimingHeatmap } from '@/components/dashboard/analytics/timing-heatmap';

import { 
  fetchPaymentAmountDistribution,
  fetchAveragePaymentValueOverTime,
} from '@/services/nodeService';

import { 
  mockTimingPatternsHeatmapData
} from '@/lib/mock-data';


export default async function AnalyticsPage({ 
  searchParams 
}: { 
  searchParams?: { aggregation?: string } 
}) {
  
  let currentAggregation = searchParams?.aggregation || aggregationPeriodOptions[0].value;
  if (!aggregationPeriodOptions.some(opt => opt.value === currentAggregation)) {
    currentAggregation = aggregationPeriodOptions[0].value;
  }

  const paymentDistributionData = await fetchPaymentAmountDistribution(currentAggregation);
  const averagePaymentValueData = await fetchAveragePaymentValueOverTime(currentAggregation);
  const timingHeatmapData = mockTimingPatternsHeatmapData;


  return (
    <div className="space-y-6">
      <PageTitle title="Node Analytics" description="Deep dive into your node's performance metrics and trends." />

      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="font-headline">Payment Amount Insights</CardTitle>
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
            distributionData={paymentDistributionData} 
            averageValueData={averagePaymentValueData} 
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
