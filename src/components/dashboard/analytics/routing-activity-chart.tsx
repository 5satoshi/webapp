'use client';

import type { RoutingActivityData, DailyRoutingVolumeData } from '@/lib/types';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { Bar, BarChart, Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import type { ChartConfig } from "@/components/ui/chart";

interface RoutingActivityChartProps {
  monthlyCountData: RoutingActivityData[];
  dailyVolumeData: DailyRoutingVolumeData[];
}

const monthlyCountConfig = {
  count: {
    label: "Routing Count",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

const dailyVolumeConfig = {
  volume: {
    label: "Routing Volume (sats)",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export function RoutingActivityChart({ monthlyCountData, dailyVolumeData }: RoutingActivityChartProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <h3 className="text-md font-semibold mb-2 font-headline text-center">Monthly Routing Count (Last 12 Months)</h3>
        {(!monthlyCountData || monthlyCountData.length === 0) ? (
            <div className="text-center text-muted-foreground p-4 h-[250px] flex items-center justify-center">No monthly count data.</div>
        ) : (
            <div className="h-[250px] w-full">
            <ChartContainer config={monthlyCountConfig} className="w-full h-full">
                <BarChart data={monthlyCountData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} className="text-xs" />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} className="text-xs" 
                    tickFormatter={(value) => `${value / 1000}k`}
                />
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                </BarChart>
            </ChartContainer>
            </div>
        )}
      </div>
      <div>
        <h3 className="text-md font-semibold mb-2 font-headline text-center">Daily Routing Volume (Last 6 Weeks)</h3>
        {(!dailyVolumeData || dailyVolumeData.length === 0) ? (
            <div className="text-center text-muted-foreground p-4 h-[250px] flex items-center justify-center">No daily volume data.</div>
        ) : (
            <div className="h-[250px] w-full">
            <ChartContainer config={dailyVolumeConfig} className="w-full h-full">
                <LineChart data={dailyVolumeData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
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
                    className="text-xs"
                    tickFormatter={(value) => `${value / 1000000}M`}
                />
                <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="line" />}
                />
                <Line type="monotone" dataKey="volume" stroke="var(--color-volume)" strokeWidth={2} dot={false} />
                </LineChart>
            </ChartContainer>
            </div>
        )}
      </div>
    </div>
  );
}
