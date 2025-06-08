
import type { KeyMetric } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Zap, Activity, Users, Network, BarChart3, PieChart, LineChart, Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
    <Card className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
      {/* Top Section: Title, Icon - Fixed Height h-16 (64px) */}
      <div className="p-4 h-16 flex flex-col justify-start">
        <div className="flex flex-row items-start justify-between">
          <div className="flex-1 mr-2 space-y-0.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <h3 className="text-sm font-medium text-muted-foreground font-body line-clamp-1 leading-tight">
                    {metric.title}
                  </h3>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{metric.title}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {/* Description is likely too much for h-16, keeping it minimal or relying on title */}
             {metric.description && (
              <p className="text-xs text-muted-foreground line-clamp-1 leading-tight">
                {metric.description}
              </p>
            )}
          </div>
          <IconComponent className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        </div>
      </div>

      {/* Middle Section: Number - Fixed Height h-16 (64px), Centered, Larger Font */}
      <div className="px-4 py-2 h-16 flex items-center justify-center">
        <div className="text-4xl font-bold font-headline text-foreground">
          {metric.displayValue}
        </div>
      </div>

      {/* Bottom Section: Unit, Trend - Fixed Height h-16 (64px) */}
      <div className="p-4 h-16 flex items-center">
        <div className="flex items-center w-full">
          {hasTrend && (
            <p className={cn(
                "text-xs text-muted-foreground flex items-center gap-1 line-clamp-1",
                isPositiveTrend ? "text-green-500" : "text-red-500"
            )}>
                {isPositiveTrend ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {isPositiveTrend ? '+' : ''}{metric.trend}% from last period
            </p>
          )}
          
          <div className="flex-grow" /> {/* Spacer to push unit to the right */}

          {metric.unit && (
            <p className="text-sm text-muted-foreground font-body line-clamp-1">
                {metric.unit}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
