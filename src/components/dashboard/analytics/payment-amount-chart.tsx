
'use client';

import type { ForwardingAmountDistributionData, ForwardingValueOverTimeData } from '@/lib/types';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Bar, BarChart, Line, LineChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import type { ChartConfig } from "@/components/ui/chart";

interface PaymentAmountChartProps {
  distributionData: ForwardingAmountDistributionData[];
  forwardingValueData: ForwardingValueOverTimeData[];
  frequencyChartTitleLabel: string;
}

const distributionConfig = {
  frequency: {
    label: "Frequency",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

const valueOverTimeConfig = {
  medianValue: {
    label: "Median Value (sats)",
    color: "hsl(var(--chart-4))", // Orange
  },
  maxValue: {
    label: "Max Value (sats)",
    color: "hsl(var(--chart-1))", // Purple
  }
} satisfies ChartConfig;

export function PaymentAmountChart({ distributionData, forwardingValueData, frequencyChartTitleLabel }: PaymentAmountChartProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
      <div>
        <h3 className="text-md font-semibold mb-2 font-headline text-center">
          Forwarding Size Frequency ({frequencyChartTitleLabel})
        </h3>
         {(!distributionData || distributionData.length === 0) ? (
            <div className="text-center text-muted-foreground p-4 h-[250px] flex items-center justify-center">No distribution data available for this period.</div>
        ) : (
            <div className="h-[250px] w-full">
            <ChartContainer config={distributionConfig} className="w-full h-full">
                <BarChart data={distributionData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="range" tickLine={false} axisLine={false} tickMargin={8} className="text-xs" />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tickMargin={8} 
                  className="text-xs" 
                  tickFormatter={(value) => {
                    const num = Number(value);
                    if (num >= 1000) {
                      return `${(num / 1000).toFixed(num % 1000 !== 0 ? 1 : 0)}k`;
                    }
                    return num.toLocaleString();
                  }}
                />
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" 
                      formatter={(value, name) => (
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: distributionConfig[name as keyof typeof distributionConfig]?.color }} />
                          <span>{distributionConfig[name as keyof typeof distributionConfig]?.label}: <strong>{Number(value).toLocaleString()}</strong></span>
                        </div>
                      )}
                    />}
                />
                <Bar dataKey="frequency" fill="var(--color-frequency)" radius={4} />
                </BarChart>
            </ChartContainer>
            </div>
        )}
      </div>
      <div>
        <h3 className="text-md font-semibold mb-2 font-headline text-center">
          Forwarding Value Over Time
        </h3>
         {(!forwardingValueData || forwardingValueData.length === 0) ? (
            <div className="text-center text-muted-foreground p-4 h-[250px] flex items-center justify-center">No value data available for this period.</div>
        ) : (
            <div className="h-[250px] w-full">
            <ChartContainer config={valueOverTimeConfig} className="w-full h-full">
                <LineChart data={forwardingValueData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                    dataKey="date" 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={8}
                    tickFormatter={(value) => new Date(value + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    className="text-xs" 
                />
                <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={8} 
                    className="text-xs"
                    tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`}
                    domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.1)]}
                />
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="line" 
                       formatter={(value, name) => (
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: valueOverTimeConfig[name as keyof typeof valueOverTimeConfig]?.color }} />
                          <span>{valueOverTimeConfig[name as keyof typeof valueOverTimeConfig]?.label}: <strong>{Number(value).toLocaleString()} sats</strong></span>
                        </div>
                      )}
                      labelFormatter={(label, payload) => {
                         if (payload && payload.length > 0 && payload[0].payload.date) {
                           return <div className="font-medium">{new Date(payload[0].payload.date + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>;
                         }
                         return label;
                       }}
                    />}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="medianValue" stroke="var(--color-medianValue)" strokeWidth={2} dot={false} name="Median Value (sats)" />
                <Line type="monotone" dataKey="maxValue" stroke="var(--color-maxValue)" strokeWidth={2} dot={false} strokeDasharray="5 5" name="Max Value (sats)" />
                </LineChart>
            </ChartContainer>
            </div>
        )}
      </div>
    </div>
  );
}
