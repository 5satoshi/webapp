
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
  
  const hasAbsoluteChange = typeof metric.absoluteChange === 'number';
  const hasTrend = typeof metric.trend === 'number' && !hasAbsoluteChange;
  const isPositiveTrend = hasTrend && metric.trend! >= 0;

  return (
    <Card className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
      {/* Top Section: Title, Icon - Fixed Height h-16 */}
      <div className="p-4 h-16 flex flex-col justify-start">
        <div className="flex flex-row items-start justify-between">
          <div className="flex-1 mr-2 space-y-0.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <h3 className="text-sm font-medium text-muted-foreground font-body line-clamp-1 leading-tight cursor-default">
                    {metric.title}
                  </h3>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{metric.title}</p>
                  {metric.description && <p className="text-xs">{metric.description}</p>}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {metric.description && (
                 <p className="text-xs text-muted-foreground line-clamp-1">{metric.description}</p>
            )}
          </div>
          <IconComponent className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        </div>
      </div>

      {/* Middle Section: Number - Fixed Height h-16, Centered, Larger Font */}
      <div className="px-4 h-16 flex items-center justify-center">
        <div className="text-4xl font-bold font-headline text-foreground">
          {metric.displayValue}
        </div>
      </div>

      {/* Bottom Section: Unit, Trend/AbsoluteChange - Fixed Height h-16, Centered Content */}
      <div className="px-4 h-16 flex items-center justify-center">
        {hasAbsoluteChange ? (
          <div className="flex items-center gap-1"> {/* Inner div for grouping icon and text */}
            {/* Icon, only if change is not zero */}
            {metric.absoluteChange !== 0 && (
              metric.absoluteChangeDirection === 'higher_is_better' ?
                (metric.absoluteChange! > 0 ?
                  <TrendingUp className="h-4 w-4 text-green-500" /> :
                  <TrendingDown className="h-4 w-4 text-red-500" />
                ) : // lower_is_better
                (metric.absoluteChange! < 0 ?
                  <TrendingDown className="h-4 w-4 text-green-500" /> :
                  <TrendingUp className="h-4 w-4 text-red-500" />
                )
            )}
            {/* Text span for the change value and description */}
            <span className={cn(
              "text-xs",
              metric.absoluteChange === 0 ? "text-muted-foreground" :
              (metric.absoluteChangeDirection === 'higher_is_better' ?
                (metric.absoluteChange! > 0 ? "text-green-500" : "text-red-500") :
                (metric.absoluteChange! < 0 ? "text-green-500" : "text-red-500"))
            )}>
              {metric.absoluteChange !== 0 && metric.absoluteChange! > 0 ? '+' : ''}
              {metric.absoluteChange}
              {' '}
              {metric.absoluteChangeDescription || "change"}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            {hasTrend ? (
              <span className={cn(
                  "flex items-center gap-1",
                  isPositiveTrend ? "text-green-500" : "text-red-500"
              )}>
                {isPositiveTrend ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {isPositiveTrend ? '+' : ''}{metric.trend}%
              </span>
            ) : (
              !metric.unit && <div className="h-4 w-4" /> 
            )}
            
            {hasTrend && metric.unit && (
              <span className="mx-1 text-muted-foreground">|</span>
            )}

            {metric.unit && (
              <span className="text-sm text-muted-foreground font-body line-clamp-1">
                  {metric.unit}
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
