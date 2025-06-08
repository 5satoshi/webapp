
'use client';

import type { PaymentAmountDistributionData, AveragePaymentValueData } from '@/lib/types';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, Line, LineChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import type { ChartConfig } from "@/components/ui/chart";

interface PaymentAmountChartProps {
  distributionData: PaymentAmountDistributionData[];
  averageValueData: AveragePaymentValueData[];
}

const distributionConfig = {
  frequency: {
    label: "Frequency",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

const averageValueConfig = {
  averageValue: {
    label: "Avg. Value (sats)",
    color: "hsl(var(--chart-4))",
  },
} satisfies ChartConfig;

export function PaymentAmountChart({ distributionData, averageValueData }: PaymentAmountChartProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="text-md font-semibold mb-2 font-headline text-center">Payment Size Frequency</h3>
         {(!distributionData || distributionData.length === 0) ? (
            <div className="text-center text-muted-foreground p-4 h-[250px] flex items-center justify-center">No distribution data available for this period.</div>
        ) : (
            <div className="h-[250px] w-full">
            <ChartContainer config={distributionConfig} className="w-full h-full">
                <BarChart data={distributionData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="range" tickLine={false} axisLine={false} tickMargin={8} className="text-xs" />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} className="text-xs" 
                  tickFormatter={(value) => Number(value).toLocaleString()}
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
        <h3 className="text-md font-semibold mb-2 font-headline text-center">Average Payment Value Over Time</h3>
         {(!averageValueData || averageValueData.length === 0) ? (
            <div className="text-center text-muted-foreground p-4 h-[250px] flex items-center justify-center">No average value data available for this period.</div>
        ) : (
            <div className="h-[250px] w-full">
            <ChartContainer config={averageValueConfig} className="w-full h-full">
                <LineChart data={averageValueData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                    dataKey="date" 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={8}
                    tickFormatter={(value) => new Date(value + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} // Ensure date is treated as UTC
                    className="text-xs" 
                />
                <YAxis 
                    tickLine={false} 
                    axisLine={false} 
                    tickMargin={8} 
                    className="text-xs"
                    tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`}
                />
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="line" 
                       formatter={(value, name) => (
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: averageValueConfig[name as keyof typeof averageValueConfig]?.color }} />
                          <span>{averageValueConfig[name as keyof typeof averageValueConfig]?.label}: <strong>{Number(value).toLocaleString()} sats</strong></span>
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
                <Line type="monotone" dataKey="averageValue" stroke="var(--color-averageValue)" strokeWidth={2} dot={false} />
                </LineChart>
            </ChartContainer>
            </div>
        )}
      </div>
    </div>
  );
}
