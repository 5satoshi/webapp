
import Link from 'next/link';
import { PageTitle } from '@/components/ui/page-title';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { aggregationPeriodOptions } from '@/lib/mock-data';
import { NetworkSubsumptionChart } from '@/components/dashboard/analytics/network-subsumption-chart';
import { ShortestPathCategoryCard } from '@/components/dashboard/subsumption/ShortestPathCategoryCard';
import { KeyMetricsCard } from '@/components/dashboard/overview/key-metrics-card';
import { 
  fetchTopNodesBySubsumption,
  fetchNetworkSubsumptionDataForOurNode,
  fetchOurNodeRankForCategories,
} from '@/services/nodeService';
import type { AllTopNodes, NetworkSubsumptionData, OurNodeRanksForAllCategories, KeyMetric } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { getOrdinalSuffix } from '@/lib/utils';

export default async function SubsumptionPage({ 
  searchParams 
}: { 
  searchParams?: { aggregation?: string } 
}) {
  
  let currentAggregation = searchParams?.aggregation || 'week'; // Default to 'week'
  if (!aggregationPeriodOptions.some(opt => opt.value === currentAggregation)) {
    currentAggregation = 'week'; // Fallback if invalid param
  }

  const topNodesData: AllTopNodes = await fetchTopNodesBySubsumption(3);
  const ourNodeTimelineData: NetworkSubsumptionData[] = await fetchNetworkSubsumptionDataForOurNode(currentAggregation);
  const ourNodeRanks: OurNodeRanksForAllCategories = await fetchOurNodeRankForCategories(currentAggregation);

  const introText1 = `How do the activity numbers of our node compare to the overall network, how are we doing? We’re trying to bring more light into that by looking at the total network graph, with all its channels and routing fees.`;
  const introText2 = `It’s possible to calculate the share of 'cheapest' (shortest) paths per node a transaction is optimally taking through the network. This calculation is dependent on the size of the transaction. We’re presenting the share of our node for a common transaction (50,000sat), a micro transaction (200sat) and a macro transaction (4,000,000sat). Also we show, how this share is changing over time for these payment sizes.`;
  
  const rankingExplanation = `There are a couple of node ranking solutions available that try to introduce some arbitrary logic to define good quality of a node. Some of them are proprietary and closed, which opens the door for manipulation. Here we’re introducing another ranking mechanism that is leveraging standard graph analytics tools. Because every sender is aiming to find the cheapest route, it is most obvious to make use of shortest path finding algorithms for weighted directed graphs. The "Shortest Path Share" indicates how often a node is part of such an optimal, cheapest path for a given payment size.`;

  let descriptiveLabel = '7 Days'; // Default for week
  const selectedOption = aggregationPeriodOptions.find(opt => opt.value === currentAggregation);
  if (selectedOption) {
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
        descriptiveLabel = selectedOption.label.replace(/s$/, ''); 
        break;
    }
  }

  const ourNodeRankMetrics: KeyMetric[] = [
    {
      id: 'our_node_micro_rank',
      title: `Our Micro Rank (last ${descriptiveLabel})`,
      displayValue: ourNodeRanks.micro.latestRank !== null ? `${ourNodeRanks.micro.latestRank}${getOrdinalSuffix(ourNodeRanks.micro.latestRank)}` : 'N/A',
      iconName: 'LineChart',
      absoluteChange: ourNodeRanks.micro.rankChange,
      absoluteChangeDescription: ``, 
      absoluteChangeDirection: 'lower_is_better',
      description: `Current rank for micro (200 sats) payments.`,
    },
    {
      id: 'our_node_common_rank',
      title: `Our Common Rank (last ${descriptiveLabel})`,
      displayValue: ourNodeRanks.common.latestRank !== null ? `${ourNodeRanks.common.latestRank}${getOrdinalSuffix(ourNodeRanks.common.latestRank)}` : 'N/A',
      iconName: 'LineChart',
      absoluteChange: ourNodeRanks.common.rankChange,
      absoluteChangeDescription: ``,
      absoluteChangeDirection: 'lower_is_better',
      description: `Current rank for common (50k sats) payments.`,
    },
    {
      id: 'our_node_macro_rank',
      title: `Our Macro Rank (last ${descriptiveLabel})`,
      displayValue: ourNodeRanks.macro.latestRank !== null ? `${ourNodeRanks.macro.latestRank}${getOrdinalSuffix(ourNodeRanks.macro.latestRank)}` : 'N/A',
      iconName: 'LineChart',
      absoluteChange: ourNodeRanks.macro.rankChange,
      absoluteChangeDescription: ``,
      absoluteChangeDirection: 'lower_is_better',
      description: `Current rank for macro (4M sats) payments.`,
    },
  ];


  return (
    <div className="space-y-6">
      <PageTitle 
        title="Routing Analysis" 
        description="Understanding our node's position and performance within the broader Lightning Network by analyzing shortest path shares." 
      />

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Shortest Path Share & Network Position</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>{introText1}</p>
          <p>{introText2}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Top Nodes by Shortest Path Share</CardTitle>
          <CardDescription>
            Ranking of the top 3 nodes for micro, common, and macro payment sizes based on their latest shortest path share.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{rankingExplanation}</p>
          {(topNodesData.micro.length > 0 || topNodesData.common.length > 0 || topNodesData.macro.length > 0) ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ShortestPathCategoryCard 
                title="Micro" 
                paymentSizeLabel="(200 sats)"
                nodes={topNodesData.micro}
                categoryType="micro"
              />
              <ShortestPathCategoryCard 
                title="Common" 
                paymentSizeLabel="(50k sats)"
                nodes={topNodesData.common}
                categoryType="common"
              />
              <ShortestPathCategoryCard 
                title="Macro" 
                paymentSizeLabel="(4M sats)"
                nodes={topNodesData.macro}
                categoryType="macro"
              />
            </div>
          ) : (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>No Top Node Data</AlertTitle>
              <AlertDescription>Could not retrieve top node data at this time for any category.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="font-headline">Our Node's Shortest Path Share Over Time</CardTitle>
                <Tabs value={currentAggregation} className="w-full sm:w-auto">
                <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:grid-cols-4">
                    {aggregationPeriodOptions.map(option => (
                    <TabsTrigger key={option.value} value={option.value} asChild>
                        <Link href={`/subsumption?aggregation=${option.value}`}>{option.label}</Link>
                    </TabsTrigger>
                    ))}
                </TabsList>
                </Tabs>
            </div>
            <CardDescription>
                Historical trend of our node's shortest path share for micro (200 sats), common (50k sats), and macro (4M sats) payments.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <NetworkSubsumptionChart data={ourNodeTimelineData} />
           <p className="text-xs text-muted-foreground pt-1">
            This chart visualizes the likelihood of our node being part of the cheapest path for different payment sizes over the selected period. A higher percentage suggests better positioning and fee competitiveness for those transaction types. Fluctuations can indicate changes in network topology, fee strategies of other nodes, or our own channel management.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Our Node's Rank (Last {descriptiveLabel})</CardTitle>
          <CardDescription>
            Current network rank of our node for different payment sizes compared to the start of the selected period. Lower rank is better.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {ourNodeRankMetrics.map((metric) => (
              <KeyMetricsCard key={metric.id} metric={metric} />
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}

```