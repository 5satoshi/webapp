
'use client';

import type { NetworkSubsumptionData } from '@/lib/types';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import type { ChartConfig } from "@/components/ui/chart";
import { format as formatDateFns, parseISO, getQuarter, getWeek } from 'date-fns';

interface NetworkSubsumptionChartProps {
  data: NetworkSubsumptionData[];
  aggregationPeriod: string;
}

const chartConfig = {
  micro: { label: "Micro (200 sats)", color: "hsl(var(--chart-1))" },
  common: { label: "Common (50k sats)", color: "hsl(var(--chart-2))" },
  macro: { label: "Macro (4M sats)", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;

const formatXAxisTick = (tickItem: string, aggregationPeriod: string) => {
  try {
    const dateObj = parseISO(tickItem);
    switch (aggregationPeriod.toLowerCase()) {
      case 'day':
        return formatDateFns(dateObj, 'MMM d');
      case 'week':
        return `W${getWeek(dateObj, { weekStartsOn: 1 })}`;
      case 'month':
        return formatDateFns(dateObj, 'MMM');
      case 'quarter':
        return `Q${getQuarter(dateObj)}`;
      default:
        return formatDateFns(dateObj, 'MMM d');
    }
  } catch (e) {
    return tickItem;
  }
};

export function NetworkSubsumptionChart({ data, aggregationPeriod }: NetworkSubsumptionChartProps) {
  if (!data || data.length === 0) {
    return <div className="text-center text-muted-foreground p-4 h-[300px] flex items-center justify-center">No shortest path share data available.</div>;
  }

  return (
    <div className="h-[300px] w-full">
      <ChartContainer config={chartConfig} className="w-full h-full">
        <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
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
            tickFormatter={(value) => `${value}%`}
            className="text-xs"
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent 
                indicator="line" 
                labelFormatter={(_, payload) => {
                  if (payload && payload.length > 0) {
                    return <div className="font-medium">{formatDateFns(parseISO(payload[0].payload.date), 'PPPP')}</div>;
                  }
                  return null;
                }}
                formatter={(value, name) => (
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chartConfig[name as keyof typeof chartConfig]?.color }} />
                    <span>{chartConfig[name as keyof typeof chartConfig]?.label}: <strong>{value}%</strong></span>
                  </div>
                )}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Line type="monotone" dataKey="micro" stroke="var(--color-micro)" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="common" stroke="var(--color-common)" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="macro" stroke="var(--color-macro)" strokeWidth={2} dot={false} />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
