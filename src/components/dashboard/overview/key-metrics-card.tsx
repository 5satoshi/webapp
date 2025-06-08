
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

  // Determine which icon to show for absoluteChange
  let TrendIconComponent: React.ElementType | null = null;
  if (hasAbsoluteChange && metric.absoluteChange !== 0) {
    if (metric.absoluteChangeDirection === 'higher_is_better') {
      TrendIconComponent = metric.absoluteChange! > 0 ? TrendingUp : TrendingDown;
    } else { // lower_is_better
      TrendIconComponent = metric.absoluteChange! < 0 ? TrendingUp : TrendingDown;
    }
  }

  // Determine color for absoluteChange (icon and text)
  let absoluteChangeColorClass = "text-muted-foreground";
  if (hasAbsoluteChange && metric.absoluteChange !== 0) {
    const isGoodChange = metric.absoluteChangeDirection === 'higher_is_better'
      ? metric.absoluteChange! > 0
      : metric.absoluteChange! < 0;
    absoluteChangeColorClass = isGoodChange ? "text-green-500" : "text-red-500";
  }


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
          <div className={cn(
            "flex items-center justify-center gap-1",
            absoluteChangeColorClass
          )}>
            {TrendIconComponent && <TrendIconComponent className="h-4 w-4" />}
            <span className="text-xs">
              {metric.absoluteChange !== 0 && metric.absoluteChange! > 0 && metric.absoluteChangeDirection === 'higher_is_better' ? '+' : ''}
              {metric.absoluteChange !== 0 && metric.absoluteChange! > 0 && metric.absoluteChangeDirection === 'lower_is_better' ? '+' : ''}
              {metric.absoluteChange}
              {' '}
              {metric.absoluteChangeDescription || ""}
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
