
import Link from 'next/link';
import { PageTitle } from '@/components/ui/page-title';
import { KeyMetricsCard } from '@/components/dashboard/overview/key-metrics-card';
import { SampleOverviewChart } from '@/components/dashboard/overview/sample-overview-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { aggregationPeriodOptions } from '@/lib/mock-data'; 
import { 
  fetchKeyMetrics, 
  fetchHistoricalForwardingVolume,
  fetchPeriodForwardingSummary,
  fetchPeriodChannelActivity,
  fetchBetweennessRank,
  fetchShortestPathShare
} from '@/services/overviewService'; 
import type { KeyMetric, BetweennessRankData, ShortestPathShareData } from '@/lib/types';
import { getOrdinalSuffix } from '@/lib/utils';
import { BarChart3 } from 'lucide-react'; 

export const dynamic = 'force-dynamic'; 

const LnRouterLogoIcon = ({ className }: { className?: string }) => (
  <svg
    width="24" 
    height="24"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    className={className} 
    fill="#00C4B3" 
  >
    <path
      d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z"
    />
  </svg>
);

const AmbossLogoIcon = ({ className }: { className?: string }) => (
  <svg 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
  >
    <defs>
      <linearGradient id="ambossGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{stopColor: 'rgb(236, 72, 153)', stopOpacity: 1}} /> 
        <stop offset="100%" style={{stopColor: 'rgb(139, 92, 246)', stopOpacity: 1}} />
      </linearGradient>
    </defs>
    <path 
      d="M6 19 L12 7 L18 19 H15 L12 13 L9 19 H6Z"
      fill="url(#ambossGradient)" 
    />
  </svg>
);

const LnPlusLogoIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="12" cy="12" r="11" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="1.5" />
    <path
      d="M11.9162 5.33301L8.41618 12.4997H12.7495L11.0828 18.6663L14.5828 11.4997H10.2495L11.9162 5.33301Z"
      fill="hsl(var(--primary))" 
    />
  </svg>
);

const OneMlLogoIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 80 80"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect width="80" height="80" rx="8" ry="8" fill="#1E88E5" /> 
    <text
      x="50%"
      y="52%"
      dominantBaseline="middle"
      textAnchor="middle"
      fill="white"
      fontSize="36"
      fontFamily="var(--font-space-grotesk), sans-serif"
      fontWeight="bold"
    >
      1ML
    </text>
  </svg>
);


export default async function OverviewPage({ 
  searchParams 
}: { 
  searchParams?: { aggregation?: string } 
}) {
  
  let currentAggregation = searchParams?.aggregation || 'week'; 
  if (!aggregationPeriodOptions.some(opt => opt.value === currentAggregation)) {
    currentAggregation = 'week'; 
  }

  const keyMetrics = await fetchKeyMetrics();
  const historicalForwardingVolume = await fetchHistoricalForwardingVolume(currentAggregation);
  const channelActivity = await fetchPeriodChannelActivity(currentAggregation);
  const betweennessRankData = await fetchBetweennessRank(currentAggregation);
  const shortestPathShareData = await fetchShortestPathShare(currentAggregation);
  
  let descriptiveLabel = '7 Days'; 
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


  const shortestPathShareLatest = shortestPathShareData.latestShare;
  const shortestPathSharePrevious = shortestPathShareData.previousShare;
  const shortestPathDisplayValue = shortestPathShareLatest !== null 
    ? `${(shortestPathShareLatest * 100).toFixed(3)}%` 
    : 'N/A';
  let shortestPathAbsoluteChange: number | undefined = undefined;
  if (shortestPathShareLatest !== null && shortestPathSharePrevious !== null) {
    shortestPathAbsoluteChange = parseFloat(((shortestPathShareLatest - shortestPathSharePrevious) * 100).toFixed(3));
  }

  const periodMetrics: KeyMetric[] = [
    {
      id: 'betweenness_rank',
      title: `Betweenness Rank`,
      displayValue: betweennessRankData.latestRank !== null ? `${betweennessRankData.latestRank}${getOrdinalSuffix(betweennessRankData.latestRank)}` : 'N/A',
      iconName: 'LineChart',
      absoluteChange: (betweennessRankData.latestRank !== null && betweennessRankData.previousRank !== null) 
                      ? betweennessRankData.latestRank - betweennessRankData.previousRank 
                      : undefined,
      absoluteChangeDescription: ``, 
      absoluteChangeDirection: 'lower_is_better',
      description: `Node's current betweenness centrality rank for common payments. Lower is better.`,
    },
    {
      id: 'shortest_path_share',
      title: `Shortest Path Share (last ${descriptiveLabel})`,
      displayValue: shortestPathDisplayValue,
      iconName: 'PieChart',
      absoluteChange: shortestPathAbsoluteChange,
      absoluteChangeDescription: `%`, 
      absoluteChangeDirection: 'higher_is_better',
      description: `Expected fraction of routing attempts using this node for common payments.`,
    },
    {
      id: 'forwards_processed_period',
      title: `Forwards Processed (last ${descriptiveLabel})`,
      displayValue: (await fetchPeriodForwardingSummary(currentAggregation)).forwardsProcessedCount.toLocaleString(),
      unit: 'Forwards',
      iconName: 'Zap',
      description: `Total forwards successfully processed in the last ${descriptiveLabel.toLowerCase()}.`,
    },
    {
      id: 'channel_changes_period',
      title: `Channel Changes (last ${descriptiveLabel})`,
      displayValue: `${channelActivity.openedCount} / ${channelActivity.closedCount}`,
      unit: 'Opened / Closed',
      iconName: 'Network',
      description: `Channels opened vs closed in the last ${descriptiveLabel.toLowerCase()}.`,
    },
  ];

  const externalPlatforms = [
    { 
      name: "lightningnetwork.plus", 
      url: "https://lightningnetwork.plus/nodes/03fe8461ebc025880b58021c540e0b7782bb2bcdc99da9822f5c6d2184a59b8f69", 
      icon: LnPlusLogoIcon 
    },
    { 
      name: "Amboss.space", 
      url: "https://amboss.space/node/03fe8461ebc025880b58021c540e0b7782bb2bcdc99da9822f5c6d2184a59b8f69", 
      icon: AmbossLogoIcon
    },
    { 
      name: "1ml.com", 
      url: "https://1ml.com/node/03fe8461ebc025880b58021c540e0b7782bb2bcdc99da9822f5c6d2184a59b8f69", 
      icon: OneMlLogoIcon
    },
    { 
      name: "LN Router", 
      url: "https://lnrouter.app/node/03fe8461ebc025880b58021c540e0b7782bb2bcdc99da9822f5c6d2184a59b8f69", 
      icon: LnRouterLogoIcon 
    },
  ];

  return (
    <div className="space-y-6">
      <PageTitle 
        title="Node Overview" 
        description="Welcome to the 5satoshi Lightning Node dashboard. This platform offers a transparent view into our node's performance, operational strategy, and ongoing journey within the Lightning Network." 
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {keyMetrics.map((metric) => (
          <KeyMetricsCard key={metric.id} metric={metric} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="font-headline">Historical Forwarding Volume & Period Activity</CardTitle>
            <Tabs value={currentAggregation} className="w-full sm:w-auto">
              <TabsList className="flex flex-wrap h-auto min-h-10 items-center justify-center sm:justify-end rounded-md bg-muted p-1 text-muted-foreground gap-1">
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
          <SampleOverviewChart data={historicalForwardingVolume} aggregationPeriod={currentAggregation} />
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {periodMetrics.map((metric) => (
              <KeyMetricsCard key={metric.id} metric={metric} />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline">About 5satoshi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>
            Operating since Spring 2019, 5satoshi began as an experimental endeavor. It has since matured into a mid-scale routing node, distinguished by its pursuit of alternative configurations that differ from those of large, central routing entities.
          </p>
          <p>
            Our core mission is to identify and refine setups that enable operators with limited budgets to run profitable, efficient mid-sized routing nodes, emphasizing low local failure rates. For peer discovery and channel management, we leverage the services of lightningnetwork.plus.
          </p>
          <p>
            Summer 2022 marked the formal start of our intensive routing activities. The initial phase focuses on understanding our network topology and impact. To facilitate this, routing fees are generally minimized (e.g., 1 ppm with a zero base fee) to encourage traffic, while channels with more constrained liquidity may have appropriately higher ppm fees.
          </p>
          <div className="pt-4 mt-4 border-t">
            <h3 className="text-lg font-semibold font-headline mb-3 text-foreground">Explore on External Platforms</h3>
            <div className="grid grid-cols-2 xs:grid-cols-4 gap-4">
              {externalPlatforms.map((platform) => {
                const IconComponent = platform.icon;
                return (
                  <a 
                    key={platform.name}
                    href={platform.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 group"
                  >
                    <Card className="aspect-square bg-card group-hover:shadow-lg group-hover:border-primary/50 group-focus-visible:shadow-lg group-focus-visible:border-primary/50 transition-all duration-200">
                      <CardContent className="p-3 flex flex-col items-center justify-center text-center h-full">
                        <IconComponent className="h-7 w-7 text-primary group-hover:text-primary transition-colors" />
                        <span className="font-medium text-xs text-foreground group-hover:text-primary transition-colors mt-2 hidden lg:inline-block">{platform.name}</span>
                      </CardContent>
                    </Card>
                  </a>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
      
    </div>
  );
}
