
import Link from 'next/link';
import { PageTitle } from '@/components/ui/page-title';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { aggregationPeriodOptions } from '@/lib/mock-data';
import { NetworkSubsumptionChart } from '@/components/dashboard/analytics/network-subsumption-chart';
import { ShortestPathCategoryCard } from '@/components/dashboard/subsumption/ShortestPathCategoryCard';
import { KeyMetricsCard } from '@/components/dashboard/overview/key-metrics-card';
import { NodeSelectorForm } from '@/components/dashboard/subsumption/NodeSelectorForm';
import {
  fetchTopNodesBySubsumption,
  fetchNetworkSubsumptionDataForNode,
  fetchNodeRankForCategories,
  fetchNodeDisplayInfo,
  fetchNodeIdByAlias
} from '@/services/subsumptionService';
import { specificNodeId } from '@/lib/constants';
import type { AllTopNodes, NetworkSubsumptionData, OurNodeRanksForAllCategories, KeyMetric, NodeDisplayInfo } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { getOrdinalSuffix } from '@/lib/utils';
import { TruncatedText } from '@/components/ui/truncated-text';
import { TooltipProvider } from '@/components/ui/tooltip';
import { headers } from 'next/headers';

export default async function SubsumptionPage({
  params,
  searchParams
}: {
  params: { nodeId: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  headers(); // Opt into dynamic rendering

  const { nodeId: rawNodeIdFromPath } = params;
  const aggregationParam = searchParams.aggregation;
  let currentAggregation = (typeof aggregationParam === 'string' ? aggregationParam : undefined) || aggregationPeriodOptions[1].value; // Default to 'week'
  if (!aggregationPeriodOptions.some(opt => opt.value === currentAggregation)) {
    currentAggregation = aggregationPeriodOptions[1].value; // Ensure it's a valid option, default to 'week'
  }

  let nodeIdentifierForFormDisplay = rawNodeIdFromPath;
  let nodeIdForDataFetching = specificNodeId; // Default
  let aliasNotFoundMessage: string | null = null;

  const isRawPathLikelyNodeId = rawNodeIdFromPath && rawNodeIdFromPath.length === 66 && /^(02|03)[0-9a-fA-F]{64}$/.test(rawNodeIdFromPath);

  if (rawNodeIdFromPath) {
    if (isRawPathLikelyNodeId) {
      nodeIdForDataFetching = rawNodeIdFromPath;
    } else {
      const resolvedNodeIdFromAlias = await fetchNodeIdByAlias(rawNodeIdFromPath);
      if (resolvedNodeIdFromAlias) {
        nodeIdForDataFetching = resolvedNodeIdFromAlias;
      } else {
        if (rawNodeIdFromPath.toLowerCase() !== specificNodeId.toLowerCase() && rawNodeIdFromPath.toLowerCase() !== (await fetchNodeDisplayInfo(specificNodeId))?.alias?.toLowerCase()) {
           aliasNotFoundMessage = `Node alias "${rawNodeIdFromPath}" could not be found. Displaying data for the default node.`;
        }
      }
    }
  }


  const selectedNodeInfo: NodeDisplayInfo | null = await fetchNodeDisplayInfo(nodeIdForDataFetching);
  const displayName = selectedNodeInfo?.alias || (selectedNodeInfo?.nodeId ? `${selectedNodeInfo.nodeId.substring(0,10)}...` : 'Selected Node');

  const topNodesData: AllTopNodes = await fetchTopNodesBySubsumption(3);
  const nodeTimelineData: NetworkSubsumptionData[] = await fetchNetworkSubsumptionDataForNode(nodeIdForDataFetching, currentAggregation);
  const nodeRanks: OurNodeRanksForAllCategories = await fetchNodeRankForCategories(nodeIdForDataFetching, currentAggregation);

  const introText1 = `How do the activity numbers of a node compare to the overall network? This section brings more light into that by looking at the total network graph, with all its channels and routing fees.`;
  const introText2 = `It’s possible to calculate the share of 'cheapest' (shortest) paths per node a transaction is optimally taking through the network. This calculation is dependent on the size of the transaction. We’re presenting the share for a common transaction (50,000sat), a micro transaction (200sat) and a macro transaction (4,000,000sat). Also we show, how this share changes over time for these payment sizes.`;

  const rankingExplanation = `There are a couple of node ranking solutions available that try to introduce some arbitrary logic to define good quality of a node. Some of them are proprietary and closed, which opens the door for manipulation. Here we’re introducing another ranking mechanism that is leveraging standard graph analytics tools. Because every sender is aiming to find the cheapest route, it is most obvious to make use of shortest path finding algorithms for weighted directed graphs. The "Shortest Path Share" indicates how often a node is part of such an optimal, cheapest path for a given payment size.`;

  let descriptiveLabel = 'Last 4 Weeks';
  const selectedOption = aggregationPeriodOptions.find(opt => opt.value === currentAggregation);
  if (selectedOption) {
    switch (currentAggregation) {
      case 'day':
        descriptiveLabel = 'Last 7 Days';
        break;
      case 'week':
        descriptiveLabel = 'Last 4 Weeks';
        break;
      case 'month':
        descriptiveLabel = 'Last 3 Months';
        break;
      case 'quarter':
        descriptiveLabel = 'Last 12 Months';
        break;
      default:
        descriptiveLabel = selectedOption.label.replace(/s$/, '');
        break;
    }
  }

  const nodeRankMetrics: KeyMetric[] = [
    {
      id: 'node_micro_rank',
      title: `Micro Rank (${descriptiveLabel})`,
      displayValue: nodeRanks.micro.latestRank !== null ? `${nodeRanks.micro.latestRank}${getOrdinalSuffix(nodeRanks.micro.latestRank)}` : 'N/A',
      iconName: 'LineChart',
      absoluteChange: nodeRanks.micro.rankChange,
      absoluteChangeDescription: ``,
      absoluteChangeDirection: 'lower_is_better',
      description: `Rank for micro (200 sats) payments.`,
    },
    {
      id: 'node_common_rank',
      title: `Common Rank (${descriptiveLabel})`,
      displayValue: nodeRanks.common.latestRank !== null ? `${nodeRanks.common.latestRank}${getOrdinalSuffix(nodeRanks.common.latestRank)}` : 'N/A',
      iconName: 'LineChart',
      absoluteChange: nodeRanks.common.rankChange,
      absoluteChangeDescription: ``,
      absoluteChangeDirection: 'lower_is_better',
      description: `Rank for common (50k sats) payments.`,
    },
    {
      id: 'node_macro_rank',
      title: `Macro Rank (${descriptiveLabel})`,
      displayValue: nodeRanks.macro.latestRank !== null ? `${nodeRanks.macro.latestRank}${getOrdinalSuffix(nodeRanks.macro.latestRank)}` : 'N/A',
      iconName: 'LineChart',
      absoluteChange: nodeRanks.macro.rankChange,
      absoluteChangeDescription: ``,
      absoluteChangeDirection: 'lower_is_better',
      description: `Rank for macro (4M sats) payments.`,
    },
  ];

  return (
    <div className="space-y-6">
      <PageTitle
        title="Routing Analysis"
        description="Understanding a node's position and performance within the broader Lightning Network by analyzing shortest path shares."
      />

      {aliasNotFoundMessage && (
        <Alert className="mb-4">
          <Info className="h-4 w-4" />
          <AlertTitle>Node Alias Not Found</AlertTitle>
          <AlertDescription>{aliasNotFoundMessage}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Top Nodes by Shortest Path Share</CardTitle>
          <CardDescription>
            Ranking of the top 3 nodes for micro, common, and macro payment sizes based on their latest shortest path share.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <TruncatedText text={rankingExplanation} charLimit={200} />
          {(topNodesData.micro.length > 0 || topNodesData.common.length > 0 || topNodesData.macro.length > 0) ? (
            <TooltipProvider>
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
            </TooltipProvider>
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
          <CardTitle className="font-headline">Node-Specific Routing Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <NodeSelectorForm currentAggregation={currentAggregation} initialNodeId={nodeIdentifierForFormDisplay} />

          <div className="pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                <h3 className="text-xl font-semibold font-headline">{displayName}'s Shortest Path Share Over Time</h3>
                <Tabs value={currentAggregation} className="w-full sm:w-auto">
                <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:grid-cols-4">
                    {aggregationPeriodOptions.map(option => (
                    <TabsTrigger key={option.value} value={option.value} asChild>
                        <Link href={`/subsumption/${encodeURIComponent(nodeIdentifierForFormDisplay)}?aggregation=${option.value}`}>{option.label}</Link>
                    </TabsTrigger>
                    ))}
                </TabsList>
                </Tabs>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
                Historical trend of the selected node's shortest path share for micro (200 sats), common (50k sats), and macro (4M sats) payments over the {descriptiveLabel.toLowerCase()}.
            </p>
            <NetworkSubsumptionChart data={nodeTimelineData} />
            <p className="text-xs text-muted-foreground pt-1">
              This chart visualizes the likelihood of the selected node being part of the cheapest path for different payment sizes over the selected period. A higher percentage suggests better positioning and fee competitiveness for those transaction types. Fluctuations can indicate changes in network topology, fee strategies of other nodes, or the node's own channel management.
            </p>
          </div>
          
          <div className="pt-4">
            <h3 className="text-xl font-semibold font-headline mb-2">{displayName}'s Rank ({descriptiveLabel})</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Current network rank of the selected node for different payment sizes compared to the start of the selected period. Lower rank is better.
            </p>
            <TooltipProvider>
              <div className="grid gap-4 md:grid-cols-3">
                {nodeRankMetrics.map((metric) => (
                  <KeyMetricsCard key={metric.id} metric={metric} />
                ))}
              </div>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">About Shortest Path Share</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>{introText1}</p>
          <p>{introText2}</p>
        </CardContent>
      </Card>

    </div>
  );
}
