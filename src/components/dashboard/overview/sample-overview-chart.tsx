'use client';

import type { TimeSeriesData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
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
        <AreaChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
          <defs>
            <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-volume)" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="var(--color-volume)" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
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
            cursor={false}
            content={<ChartTooltipContent indicator="dot" />}
          />
          <Area
            dataKey="value"
            name="Payment Volume (sats)"
            type="monotone"
            fill="url(#colorVolume)"
            stroke="var(--color-volume)"
            stackId="a"
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
