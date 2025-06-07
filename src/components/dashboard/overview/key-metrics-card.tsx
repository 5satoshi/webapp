
import type { KeyMetric } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Zap, Activity, Users, Network, BarChart3, PieChart, LineChart, Clock } from 'lucide-react';
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
  Users,
};

export function KeyMetricsCard({ metric }: KeyMetricsCardProps) {
  const IconComponent = iconMap[metric.iconName] || Activity;
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
        <div className="text-3xl font-bold font-headline text-foreground">{metric.displayValue}</div>
        {metric.unit && (
          <p className="text-sm text-muted-foreground pt-1 font-body">{metric.unit}</p>
        )}
        {hasTrend && (
          <p className={cn(
            "text-xs text-muted-foreground flex items-center gap-1 pt-1",
            isPositiveTrend ? "text-green-500" : "text-red-500"
          )}>
            {isPositiveTrend ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {isPositiveTrend ? '+' : ''}{metric.trend}% from last period
          </p>
        )}
        {metric.description && !metric.unit && ( // Only show description if unit isn't already taking its place for brevity
            <p className="text-xs text-muted-foreground pt-1">{metric.description}</p>
        )}
         {metric.description && metric.unit && ( // If both unit and description exist, show description slightly smaller
            <p className="text-xs text-muted-foreground pt-1">{metric.description}</p>
        )}
      </CardContent>
    </Card>
  );
}
