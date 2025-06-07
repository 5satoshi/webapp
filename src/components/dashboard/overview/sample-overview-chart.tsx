
'use client';

import type { TimeSeriesData } from '@/lib/types';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, CartesianGrid, XAxis, YAxis } from 'recharts';
import type { ChartConfig } from "@/components/ui/chart"

interface SampleOverviewChartProps {
  data: TimeSeriesData[];
}

const chartConfig = {
  volume: {
    label: "Payment Volume (sats)",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export function SampleOverviewChart({ data }: SampleOverviewChartProps) {
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
            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
            radius={[4, 4, 0, 0]} // Optional: rounds the top corners of the bars
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
