'use client';

import type { FeeDistributionData } from '@/lib/types';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import type { ChartConfig } from "@/components/ui/chart";

interface FeeDistributionChartProps {
  data: FeeDistributionData[];
}

const chartConfig = {
  ppm: {
    label: "PPM",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function FeeDistributionChart({ data }: FeeDistributionChartProps) {
  if (!data || data.length === 0) {
    return <div className="text-center text-muted-foreground p-4">No fee distribution data available.</div>;
  }
  
  const chartData = data.map(item => ({
    name: item.type === 'remote' ? 'Remote Channels' : 'Local Channels',
    ppm: item.ppm,
  }));

  return (
    <div className="h-[250px] w-full">
      <ChartContainer config={chartConfig} className="w-full h-full">
        <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
          <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
          <XAxis type="number" dataKey="ppm" tickLine={false} axisLine={false} tickMargin={8} className="text-xs" />
          <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tickMargin={8} className="text-xs capitalize" width={120} />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="dot" />}
          />
          <Bar dataKey="ppm" fill="var(--color-ppm)" radius={4} barSize={30} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
