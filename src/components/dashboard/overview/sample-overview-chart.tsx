
'use client';

import type { TimeSeriesData } from '@/lib/types';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { BarChart, Bar, LineChart, Line, CartesianGrid, XAxis, YAxis, ComposedChart } from 'recharts';
import type { ChartConfig } from "@/components/ui/chart"
import { format as formatDateFns, parseISO, getQuarter } from 'date-fns';

interface SampleOverviewChartProps {
  data: TimeSeriesData[];
  aggregationPeriod: string;
}

const chartConfig = {
  paymentVolume: {
    label: "Payment Volume (BTC)",
    color: "hsl(var(--chart-1))",
  },
  transactionCount: {
    label: "Transaction Count",
    color: "hsl(var(--chart-2))",
  }
} satisfies ChartConfig

const formatXAxisTick = (tickItem: string, aggregationPeriod: string) => {
  try {
    const dateObj = parseISO(tickItem); 
    switch (aggregationPeriod.toLowerCase()) {
      case 'day':
        return formatDateFns(dateObj, 'MMM d');
      case 'week':
        return formatDateFns(dateObj, 'MMM d'); 
      case 'month':
        return formatDateFns(dateObj, 'MMM yy');
      case 'quarter':
        const quarter = getQuarter(dateObj);
        return `Q${quarter} ${formatDateFns(dateObj, 'yy')}`;
      default:
        return formatDateFns(dateObj, 'MMM d');
    }
  } catch (e) {
    // console.error("Error formatting date for X-axis:", tickItem, e);
    return tickItem; 
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
        <ComposedChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
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
            yAxisId="left"
            tickLine={false} 
            axisLine={false} 
            tickMargin={8}
            tickFormatter={(value) => `${Number(value).toFixed(2)}`} // Format for BTC, 2 decimal places
            className="text-xs"
            domain={['auto', 'auto']}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            className="text-xs"
            domain={['auto', 'auto']}
             tickFormatter={(value) => value.toLocaleString()}
          />
          <ChartTooltip
            cursor={{fill: 'hsl(var(--accent) / 0.2)'}}
            content={
              <ChartTooltipContent 
                indicator="dot" 
                formatter={(value, name, props) => {
                  const itemConfig = chartConfig[name as keyof typeof chartConfig];
                  const formattedValue = name === 'paymentVolume' 
                    ? `${Number(value).toFixed(6)} BTC` // Format for BTC in tooltip
                    : Number(value).toLocaleString();
                  return (
                     <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: itemConfig?.color }} />
                      <span>{itemConfig?.label}: <strong>{formattedValue}</strong></span>
                    </div>
                  );
                }}
                 labelFormatter={(label, payload) => {
                  if (payload && payload.length > 0 && payload[0].payload.date) {
                    return <div className="font-medium">{formatXAxisTick(payload[0].payload.date, aggregationPeriod)}</div>;
                  }
                  return label;
                }}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar
            yAxisId="left"
            dataKey="paymentVolume"
            name="Payment Volume (BTC)"
            fill="var(--color-paymentVolume)"
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="transactionCount"
            name="Transaction Count"
            stroke="var(--color-transactionCount)"
            strokeWidth={2}
            dot={{ r: 3, fill: 'var(--color-transactionCount)' }}
            activeDot={{r: 5}}
          />
        </ComposedChart>
      </ChartContainer>
    </div>
  );
}
