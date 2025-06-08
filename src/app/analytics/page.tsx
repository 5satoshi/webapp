
import Link from 'next/link';
import { PageTitle } from '@/components/ui/page-title';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { aggregationPeriodOptions } from '@/lib/mock-data'; // Changed from timescaleOptions

import { PaymentAmountChart } from '@/components/dashboard/analytics/payment-amount-chart';
import { NetworkSubsumptionChart } from '@/components/dashboard/analytics/network-subsumption-chart';
import { TimingHeatmap } from '@/components/dashboard/analytics/timing-heatmap';

import { 
  fetchPaymentAmountDistribution,
  fetchAveragePaymentValueOverTime,
  fetchShortestPathShare, // Assuming this might be used or similar, keeping for context if needed.
                           // Or, if not, it would be removed if strictly not part of this page's display data.
  // For network subsumption and timing heatmap, we'll assume they either have dedicated fetchers
  // or use existing mock data for now as per the user's focus on payment charts.
} from '@/services/nodeService';

import { 
  mockNetworkSubsumptionData, // Kept for NetworkSubsumptionChart
  mockTimingPatternsHeatmapData // Kept for TimingHeatmap
} from '@/lib/mock-data';


export default async function AnalyticsPage({ 
  searchParams 
}: { 
  searchParams?: { aggregation?: string } 
}) {
  
  let currentAggregation = searchParams?.aggregation || aggregationPeriodOptions[0].value; // Default to first option
  if (!aggregationPeriodOptions.some(opt => opt.value === currentAggregation)) {
    currentAggregation = aggregationPeriodOptions[0].value;
  }

  const paymentDistributionData = await fetchPaymentAmountDistribution(currentAggregation);
  const averagePaymentValueData = await fetchAveragePaymentValueOverTime(currentAggregation);
  // Assuming networkSubsumptionData and timingHeatmapData are fetched or remain mock for now
  // For this example, we'll keep them as mock to focus on the changed parts.
  const networkSubsumptionData = mockNetworkSubsumptionData;
  const timingHeatmapData = mockTimingPatternsHeatmapData;


  return (
    <div className="space-y-6">
      <PageTitle title="Node Analytics" description="Deep dive into your node's performance metrics and trends." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Network Subsumption</CardTitle>
          </CardHeader>
          <CardContent>
            <NetworkSubsumptionChart data={networkSubsumptionData} />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <CardTitle className="font-headline">Payment Amount Insights</CardTitle>
                  <Tabs value={currentAggregation} className="w-full sm:w-auto">
                  <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:grid-cols-4"> {/* Adjusted grid-cols for 4 options */}
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
      </div>
      
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
