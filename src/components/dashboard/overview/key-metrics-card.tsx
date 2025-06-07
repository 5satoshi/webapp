
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
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
      {/* Title Section: target 3 lines max. text-sm line-height is ~1.4rem. 3 lines ~4.2rem. */}
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 min-h-[4.2rem]">
        <CardTitle className="text-sm font-medium text-muted-foreground font-body mr-2 line-clamp-3">
          {metric.title}
        </CardTitle>
        <IconComponent className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
      </CardHeader>
      
      <CardContent className="flex flex-col pt-0 flex-grow">
        {/* Number Section: target 1 line. text-3xl line-height ~2.25rem. */}
        <div className="min-h-[2.75rem] flex items-center"> 
          <div className="text-3xl font-bold font-headline text-foreground">{metric.displayValue}</div>
        </div>
        
        {/* Unit/Description/Trend Section: target 2 lines total. text-sm line-height ~1.4rem * 2 = 2.8rem. */}
        <div className="min-h-[2.8rem] pt-1 space-y-0.5 flex flex-col justify-start">
          {metric.unit && (
            <p className="text-sm text-muted-foreground font-body truncate">
              {metric.unit}
            </p>
          )}
          {hasTrend && (
            <p className={cn(
              "text-xs text-muted-foreground flex items-center gap-1 truncate",
              isPositiveTrend ? "text-green-500" : "text-red-500"
            )}>
              {isPositiveTrend ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {isPositiveTrend ? '+' : ''}{metric.trend}% from last period
            </p>
          )}
          {/* Show description if it won't cause more than two effective lines with unit & trend */}
          {metric.description && (!metric.unit || !hasTrend) && (
            <p className="text-xs text-muted-foreground truncate">
              {metric.description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
