
'use client';

import type { TimeSeriesData } from '@/lib/types';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, CartesianGrid, XAxis, YAxis } from 'recharts';
import type { ChartConfig } from "@/components/ui/chart"
import { format as formatDateFns, parseISO, getQuarter } from 'date-fns';

interface SampleOverviewChartProps {
  data: TimeSeriesData[];
  aggregationPeriod: string;
}

const chartConfig = {
  volume: {
    label: "Payment Volume (sats)",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

const formatXAxisTick = (tickItem: string, aggregationPeriod: string) => {
  try {
    const dateObj = parseISO(tickItem); // Assuming tickItem is 'YYYY-MM-DD'
    switch (aggregationPeriod) {
      case 'day':
        return formatDateFns(dateObj, 'MMM d');
      case 'week':
        return formatDateFns(dateObj, 'MMM d'); // Start of the week
      case 'month':
        return formatDateFns(dateObj, 'MMM yyyy');
      case 'quarter':
        const quarter = getQuarter(dateObj);
        return `Q${quarter} ${formatDateFns(dateObj, 'yyyy')}`;
      default:
        return formatDateFns(dateObj, 'MMM d');
    }
  } catch (e) {
    console.error("Error formatting date for X-axis:", tickItem, e);
    return tickItem; // Fallback to original value
  }
};

export function SampleOverviewChart({ data, aggregationPeriod }: SampleOverviewChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No data available for this period.
      </div>
    );
  }
  
  return (
    <div className="h-[300px] w-full">
      <ChartContainer config={chartConfig} className="w-full h-full">
        <BarChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="date" 
            tickLine={false} 
            axisLine={false} 
            tickMargin={8}
            tickFormatter={(value) => formatXAxisTick(value, aggregationPeriod)}
            className="text-xs"
          />
          <YAxis 
            tickLine={false} 
            axisLine={false} 
            tickMargin={8}
            tickFormatter={(value) => `${value / 1000}k`}
            className="text-xs"
          />
          <ChartTooltip
            cursor={{fill: 'hsl(var(--accent) / 0.2)'}}
            content={<ChartTooltipContent indicator="dot" />}
          />
          <Bar
            dataKey="value"
            name="Payment Volume (sats)"
            fill="var(--color-volume)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
