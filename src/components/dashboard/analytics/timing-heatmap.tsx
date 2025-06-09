
'use client';

import type { HeatmapCell } from '@/lib/types';
import { CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React, { useState, useMemo } from 'react'; 

interface TimingHeatmapProps {
  data: HeatmapCell[];
}

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));

// Orange color from theme: hsl(var(--secondary)) -> HSL 34 100% 50%
const ORANGE_HUE = 34;
const ORANGE_SATURATION_MAX = 100;
const ORANGE_LIGHTNESS_TARGET = 50;

const getCellColor = (
  currentValue: number,
  maxObservedValue: number
): string => {
  if (currentValue <= 0 || maxObservedValue === 0) { // Also handles cases where currentValue is 0
    return 'hsl(0, 0%, 95%)'; // Very light gray for no or zero activity
  }

  // Normalize the current value: 0 for min (0), 1 for maxObservedValue
  const normalized = Math.min(1, Math.max(0, currentValue / maxObservedValue));

  // Interpolate saturation: from low (e.g., 20%) for near-zero values to ORANGE_SATURATION_MAX
  const saturation = Math.round(20 + normalized * (ORANGE_SATURATION_MAX - 20));
  // Interpolate lightness: from high (e.g., 95%, almost white) for near-zero values to ORANGE_LIGHTNESS_TARGET
  const lightness = Math.round(95 - normalized * (95 - ORANGE_LIGHTNESS_TARGET));

  return `hsl(${ORANGE_HUE}, ${saturation}%, ${lightness}%)`;
};

export function TimingHeatmap({ data }: TimingHeatmapProps) {
  const [selectedMetric, setSelectedMetric] = useState<'successfulForwards' | 'failedForwards'>('successfulForwards');

  const cellDataMap = useMemo(() => {
    const map = new Map<string, HeatmapCell>();
    if (data) {
      data.forEach(cell => {
        map.set(`${cell.day}-${cell.hour}`, cell);
      });
    }
    return map;
  }, [data]);

  const maxCountForSelectedMetric = useMemo(() => {
    if (!data || data.length === 0) return 0;
    const counts = data.map(cell => cell[selectedMetric]);
    return Math.max(...counts, 0);
  }, [data, selectedMetric]);

  if (!data || data.length === 0) {
    return <div className="text-center text-muted-foreground p-4">No timing data available.</div>;
  }

  const metricLabel = selectedMetric === 'successfulForwards' ? 'Successful Forwards' : 'Failed Forwards';

  return (
    <TooltipProvider>
      <div className="mb-4">
        <Tabs value={selectedMetric} onValueChange={(value) => setSelectedMetric(value as 'successfulForwards' | 'failedForwards')} className="w-full sm:w-auto">
          <TabsList className="grid w-full grid-cols-2 sm:w-auto">
            <TabsTrigger value="successfulForwards">Successful Forwards</TabsTrigger>
            <TabsTrigger value="failedForwards">Failed Forwards</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="overflow-x-auto">
        <div className="grid gap-px bg-border my-2" style={{ gridTemplateColumns: `auto repeat(${hours.length}, minmax(0, 1fr))` }}>
          <div className="p-1 text-xs bg-card"></div>
          {hours.map(hour => (
            <div key={`hour-${hour}`} className="p-1 text-xs text-center font-medium bg-card text-muted-foreground">
              {hour}
            </div>
          ))}
          
          {days.map((dayLabel, dayIndex) => (
            <React.Fragment key={`day-row-${dayIndex}`}>
              <div key={`daylabel-${dayIndex}`} className="p-1 text-xs text-center font-medium bg-card text-muted-foreground flex items-center justify-center">
                {dayLabel}
              </div>
              {hours.map((hourLabel, hourIndex) => {
                const cell = cellDataMap.get(`${dayIndex}-${hourIndex}`) || { day: dayIndex, hour: hourIndex, successfulForwards: 0, failedForwards: 0 };
                const currentValueForMetric = cell[selectedMetric];
                const color = getCellColor(currentValueForMetric, maxCountForSelectedMetric);
                
                const totalForwards = cell.successfulForwards + cell.failedForwards;
                const successRate = totalForwards > 0 ? (cell.successfulForwards / totalForwards) * 100 : 0;

                return (
                  <Tooltip key={`${dayIndex}-${hourIndex}`}>
                    <TooltipTrigger asChild>
                      <div
                        className="h-6 w-full rounded-sm" 
                        style={{ backgroundColor: color }}
                        aria-label={`Data for ${dayLabel} ${hourLabel}:00`}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">{dayLabel}, {hourLabel}:00 - {(parseInt(hourLabel)+1).toString().padStart(2, '0')}:00</p>
                      <p>Successful Forwards: {cell.successfulForwards.toLocaleString()}</p>
                      <p>Failed Forwards: {cell.failedForwards.toLocaleString()}</p>
                      <p>Total Forwards: {totalForwards.toLocaleString()}</p>
                      <p>Success Rate: {totalForwards > 0 ? successRate.toFixed(1) + '%' : 'N/A'}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
       <CardDescription className="mt-2 text-xs">
        Heatmap visualizes forwarding activity from the last 8 weeks. Cell color intensity (from white to orange) indicates the volume of <strong>{metricLabel.toLowerCase()}</strong> for that hour and day. Hover over cells for detailed counts.
      </CardDescription>
    </TooltipProvider>
  );
}
