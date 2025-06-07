
import Link from 'next/link';
import { PageTitle } from '@/components/ui/page-title';
import { KeyMetricsCard } from '@/components/dashboard/overview/key-metrics-card';
import { SampleOverviewChart } from '@/components/dashboard/overview/sample-overview-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { aggregationPeriodOptions } from '@/lib/mock-data'; 
import { fetchKeyMetrics, fetchHistoricalPaymentVolume } from '@/services/nodeService';

export default async function OverviewPage({ 
  searchParams 
}: { 
  searchParams?: { aggregation?: string } 
}) {
  
  let currentAggregation = searchParams?.aggregation || 'day'; // Default to 'day'
  if (!aggregationPeriodOptions.some(opt => opt.value === currentAggregation)) {
    currentAggregation = 'day'; // Default if invalid aggregation period is provided
  }

  const keyMetrics = await fetchKeyMetrics();
  const historicalPaymentVolume = await fetchHistoricalPaymentVolume(currentAggregation);

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
            <CardTitle className="font-headline">Historical Payment Volume</CardTitle>
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
        <CardContent>
          <SampleOverviewChart data={historicalPaymentVolume} aggregationPeriod={currentAggregation} />
        </CardContent>
      </Card>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Display a feed of recent node activities or important events here.</p>
            <ul className="mt-2 space-y-1 text-sm">
              <li>Channel opened with 02_new_peer_node_id (Capacity: 2M sats)</li>
              <li>Successfully forwarded payment of 500k sats</li>
              <li>Node uptime back to 100% after brief maintenance</li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Quick Links</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Frequently accessed actions or documentation.</p>
            <ul className="mt-2 space-y-1 text-sm list-disc list-inside">
              <li><Link href="/channels" className="text-primary hover:underline">Manage Channels</Link></li>
              <li><a href="#" className="text-primary hover:underline">Adjust Fee Policy</a></li>
              <li><a href="#" className="text-primary hover:underline">View Node Logs</a></li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
