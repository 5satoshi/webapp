import type { KeyMetric } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Zap, Activity, Clock, Network, BarChart3, PieChart, LineChart } from 'lucide-react';
import { cn } from '@/lib/utils';
import type React from 'react';

interface KeyMetricsCardProps {
  metric: KeyMetric;
}

const iconMap: Record<KeyMetric['iconName'], React.ElementType> = {
  Zap,
  Activity,
  Clock,
  Network,
  BarChart3,
  PieChart,
  LineChart,
};

export function KeyMetricsCard({ metric }: KeyMetricsCardProps) {
  const IconComponent = iconMap[metric.iconName] || Activity; // Default to Activity if no icon found
  const hasTrend = typeof metric.trend === 'number';
  const isPositiveTrend = hasTrend && metric.trend! >= 0;

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground font-body">
          {metric.title}
        </CardTitle>
        <IconComponent className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold font-headline text-foreground">{metric.value}</div>
        {hasTrend && (
          <p className={cn(
            "text-xs text-muted-foreground flex items-center gap-1",
            isPositiveTrend ? "text-green-500" : "text-red-500"
          )}>
            {isPositiveTrend ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {isPositiveTrend ? '+' : ''}{metric.trend}% from last period
          </p>
        )}
        {metric.description && (
            <p className="text-xs text-muted-foreground pt-1">{metric.description}</p>
        )}
      </CardContent>
    </Card>
  );
}
