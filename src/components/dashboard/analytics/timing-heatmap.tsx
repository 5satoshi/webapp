
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

// Theme colors from globals.css for full intensity
const ORANGE_HUE = 34; 
const ORANGE_SATURATION_TARGET = 100;
const ORANGE_LIGHTNESS_TARGET = 50;

const PURPLE_HUE = 277; 
const PURPLE_SATURATION_TARGET = 70;
const PURPLE_LIGHTNESS_TARGET = 36;

// Base values for "white" or min-intensity color
const BASE_SATURATION_MIN = 10; // Reduced for whiter appearance at min
const BASE_LIGHTNESS_MAX = 97; // Increased for whiter appearance at min

// Afternoon UTC hour ranges (inclusive start, exclusive end for easy checking)
const europeAfternoonHours = { start: 10, end: 16 }; // 10:00-16:59 UTC
const americaAfternoonHours = { start: 16, end: 23 }; // 16:00-23:59 UTC (covers US ET/CT/MT afternoon)
const asiaAfternoonHours = { start: 4, end: 10 }; // 04:00-10:59 UTC (covers parts of East/SE Asia afternoon)


const getCellColor = (
  currentValue: number,
  minValueForMetric: number,
  maxValueForMetric: number,
  metricType: 'successfulForwards' | 'failedForwards'
): string => {
  let hue: number;
  let targetSaturation: number;
  let targetLightness: number;

  if (metricType === 'successfulForwards') {
    hue = ORANGE_HUE;
    targetSaturation = ORANGE_SATURATION_TARGET;
    targetLightness = ORANGE_LIGHTNESS_TARGET;
  } else { // 'failedForwards'
    hue = PURPLE_HUE;
    targetSaturation = PURPLE_SATURATION_TARGET;
    targetLightness = PURPLE_LIGHTNESS_TARGET;
  }

  const range = maxValueForMetric - minValueForMetric;
  let normalized = 0;

  if (range > 0) {
    normalized = (currentValue - minValueForMetric) / range;
  } else { // All values for this metric are the same, or only one data point, or no data
    if (currentValue === 0 || maxValueForMetric === 0) { // All values are 0 or the current value is 0
        return `hsl(0, 0%, ${BASE_LIGHTNESS_MAX}%)`; // White for zero or no activity
    }
    // All values are the same non-zero number, so show full intensity
    normalized = 1; 
  }
  
  // Ensure normalized is within [0, 1]
  normalized = Math.max(0, Math.min(1, normalized));

  const saturation = Math.round(BASE_SATURATION_MIN + normalized * (targetSaturation - BASE_SATURATION_MIN));
  const lightness = Math.round(BASE_LIGHTNESS_MAX - normalized * (BASE_LIGHTNESS_MAX - targetLightness));

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

export function TimingHeatmap({ data }: TimingHeatmapProps) {
  const [selectedMetric, setSelectedMetric] = useState<'successfulForwards' | 'failedForwards'>('successfulForwards');

  const { cellDataMap, minSuccessful, maxSuccessful, minFailed, maxFailed } = useMemo(() => {
    const map = new Map<string, HeatmapCell>();
    let minS = Infinity, maxS = -Infinity, minF = Infinity, maxF = -Infinity;

    if (data && data.length > 0) {
      data.forEach(cell => {
        map.set(`${cell.day}-${cell.hour}`, cell);
        minS = Math.min(minS, cell.successfulForwards);
        maxS = Math.max(maxS, cell.successfulForwards);
        minF = Math.min(minF, cell.failedForwards);
        maxF = Math.max(maxF, cell.failedForwards);
      });
       // If all values were initial Infinity/-Infinity (no data), set to 0
      if (minS === Infinity) minS = 0;
      if (maxS === -Infinity) maxS = 0;
      if (minF === Infinity) minF = 0;
      if (maxF === -Infinity) maxF = 0;
    } else {
      minS = 0; maxS = 0; minF = 0; maxF = 0; // Handle empty data case explicitly
    }
    return { 
      cellDataMap: map, 
      minSuccessful: minS, 
      maxSuccessful: maxS, 
      minFailed: minF, 
      maxFailed: maxF 
    };
  }, [data]);


  if (!data || data.length === 0) {
    return <div className="text-center text-muted-foreground p-4">No timing data available.</div>;
  }

  const metricLabel = selectedMetric === 'successfulForwards' ? 'Successful Forwards' : 'Failed Forwards';
  const currentMinValue = selectedMetric === 'successfulForwards' ? minSuccessful : minFailed;
  const currentMaxValue = selectedMetric === 'successfulForwards' ? maxSuccessful : maxFailed;

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
          
          {days.map((dayLabel, dayIndex) => (
            <React.Fragment key={`day-row-${dayIndex}`}>
              <div key={`daylabel-${dayIndex}`} className="p-1 text-xs text-center font-medium bg-card text-muted-foreground flex items-center justify-center">
                {dayLabel}
              </div>
              {hours.map((hourLabel, hourIndex) => {
                const cell = cellDataMap.get(`${dayIndex}-${hourIndex}`) || { day: dayIndex, hour: hourIndex, successfulForwards: 0, failedForwards: 0 };
                const currentValueForMetric = cell[selectedMetric];
                const color = getCellColor(currentValueForMetric, currentMinValue, currentMaxValue, selectedMetric);
                
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
                      <p className="font-medium">{dayLabel}, {hourLabel}:00 - {(parseInt(hourLabel)+1).toString().padStart(2, '0')}:00 UTC</p>
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

          {/* Hour Labels Row (Bottom) */}
          <div className="p-1 bg-card"></div> {/* Empty cell for day label column alignment */}
          {hours.map(hour => (
            <div key={`hour-label-bottom-${hour}`} className="p-1 text-xs text-center font-medium bg-card text-muted-foreground">
              {hour}
            </div>
          ))}

          {/* Afternoon Indicators Row */}
          <div className="p-1 bg-card text-xs text-center font-medium text-muted-foreground flex items-center justify-center">UTC</div> {/* Label for this row */}
          {hours.map(hour => {
            const hourNum = parseInt(hour);
            const indicators = [];
            if (hourNum >= europeAfternoonHours.start && hourNum < europeAfternoonHours.end) indicators.push('EU');
            if (hourNum >= americaAfternoonHours.start && hourNum < americaAfternoonHours.end) indicators.push('US');
            if (hourNum >= asiaAfternoonHours.start && hourNum < asiaAfternoonHours.end) indicators.push('AS');
            
            return (
              <div 
                key={`indicator-${hour}`} 
                className="p-1 text-[10px] h-5 text-center bg-card text-muted-foreground flex items-center justify-center"
                title={`EU: ${europeAfternoonHours.start}:00-${europeAfternoonHours.end-1}:59 UTC | US: ${americaAfternoonHours.start}:00-${americaAfternoonHours.end-1}:59 UTC | AS: ${asiaAfternoonHours.start}:00-${asiaAfternoonHours.end-1}:59 UTC`}
              >
                {indicators.join('/') || '-'}
              </div>
            );
          })}
        </div>
      </div>
       <CardDescription className="mt-2 text-xs">
        Heatmap visualizes forwarding activity from the last 8 weeks. Hours are in UTC. Cell color intensity (from white representing the minimum observed count for the selected metric to full orange for successful, or white to full purple for failed for the maximum observed count) indicates the volume. The bottom row indicates approximate afternoon periods in Europe (EU), America (US), and Asia (AS). Hover over cells for detailed counts.
      </CardDescription>
    </TooltipProvider>
  );
}
