import type { KeyMetric } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KeyMetricsCardProps {
  metric: KeyMetric;
}

export function KeyMetricsCard({ metric }: KeyMetricsCardProps) {
  const Icon = metric.icon;
  const hasTrend = typeof metric.trend === 'number';
  const isPositiveTrend = hasTrend && metric.trend! >= 0;

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground font-body">
          {metric.title}
        </CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
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
