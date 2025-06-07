import { PageTitle } from '@/components/ui/page-title';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { timescaleOptions } from '@/lib/mock-data';

import { FeeDistributionChart } from '@/components/dashboard/analytics/fee-distribution-chart';
import { RoutingActivityChart } from '@/components/dashboard/analytics/routing-activity-chart';
import { PaymentAmountChart } from '@/components/dashboard/analytics/payment-amount-chart';
import { NetworkSubsumptionChart } from '@/components/dashboard/analytics/network-subsumption-chart';
import { TimingHeatmap } from '@/components/dashboard/analytics/timing-heatmap';

import { 
  mockFeeDistributionData, 
  mockRoutingActivityData, 
  mockDailyRoutingVolumeData,
  mockPaymentAmountDistributionData,
  mockAveragePaymentValueData,
  mockNetworkSubsumptionData,
  mockTimingPatternsHeatmapData
} from '@/lib/mock-data';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageTitle title="Node Analytics" description="Deep dive into your node's performance metrics and trends." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Fee Distribution (PPM)</CardTitle>
          </CardHeader>
          <CardContent>
            <FeeDistributionChart data={mockFeeDistributionData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Network Subsumption</CardTitle>
          </CardHeader>
          <CardContent>
            <NetworkSubsumptionChart data={mockNetworkSubsumptionData} />
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                 <CardTitle className="font-headline">Routing Activity</CardTitle>
                <Tabs defaultValue={timescaleOptions[1].value} className="w-full sm:w-auto">
                <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:grid-cols-5">
                    {timescaleOptions.map(option => (
                    <TabsTrigger key={option.value} value={option.value}>{option.label}</TabsTrigger>
                    ))}
                </TabsList>
                </Tabs>
            </div>
        </CardHeader>
        <CardContent>
          <RoutingActivityChart 
            monthlyCountData={mockRoutingActivityData} 
            dailyVolumeData={mockDailyRoutingVolumeData} 
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="font-headline">Payment Amount Distribution</CardTitle>
                <Tabs defaultValue={timescaleOptions[1].value} className="w-full sm:w-auto">
                <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:grid-cols-5">
                    {timescaleOptions.map(option => (
                    <TabsTrigger key={option.value} value={option.value}>{option.label}</TabsTrigger>
                    ))}
                </TabsList>
                </Tabs>
            </div>
        </CardHeader>
        <CardContent>
          <PaymentAmountChart 
            distributionData={mockPaymentAmountDistributionData} 
            averageValueData={mockAveragePaymentValueData} 
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Timing Patterns Heatmap (Last 8 Weeks)</CardTitle>
        </CardHeader>
        <CardContent>
          <TimingHeatmap data={mockTimingPatternsHeatmapData} />
        </CardContent>
      </Card>
    </div>
  );
}
