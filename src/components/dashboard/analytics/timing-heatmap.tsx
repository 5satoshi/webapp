
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
const BASE_SATURATION_MIN = 10; 
const BASE_LIGHTNESS_MAX = 97; 

const regionalIndicators = [
  { name: 'Asia', start: 6, end: 12 },    // 06:00-11:59 UTC
  { name: 'Europe', start: 13, end: 19 }, // 13:00-18:59 UTC
  { name: 'America', start: 19, end: 24 }, // 19:00-23:59 UTC (covers US ET/CT late afternoon)
].sort((a, b) => a.start - b.start); // Sort by start time for rendering logic


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

  if (currentValue < minValueForMetric) {
      normalized = 0;
  } else if (range > 0) {
    normalized = (currentValue - minValueForMetric) / range;
  } else { 
    if (maxValueForMetric === 0 && minValueForMetric === 0 && currentValue === 0) { // All values are 0
        return `hsl(0, 0%, ${BASE_LIGHTNESS_MAX}%)`; 
    }
    // All values are the same (non-zero or zero), or only one data point.
    // If all values are the same non-zero, it should be full intensity.
    // If all values are the same zero, it's covered above.
    normalized = (currentValue > 0 || maxValueForMetric > 0) ? 1 : 0;
  }
  
  normalized = Math.max(0, Math.min(1, normalized)); // Clamp between 0 and 1

  const saturation = Math.round(BASE_SATURATION_MIN + normalized * (targetSaturation - BASE_SATURATION_MIN));
  const lightness = Math.round(BASE_LIGHTNESS_MAX - normalized * (BASE_LIGHTNESS_MAX - targetLightness));

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

export function TimingHeatmap({ data }: TimingHeatmapProps) {
  const [selectedMetric, setSelectedMetric] = useState<'successfulForwards' | 'failedForwards'>('successfulForwards');

  const { 
    cellDataMap, 
    minSuccessful, maxSuccessful, 
    minFailed, maxFailed 
  } = useMemo(() => {
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
      // Ensure min/max are at least 0 if all actual values are > 0 or if dataset empty
      if (minS === Infinity) minS = 0; 
      if (maxS === -Infinity) maxS = 0;
      if (minF === Infinity) minF = 0;
      if (maxF === -Infinity) maxF = 0;
    } else {
      minS = 0; maxS = 0; minF = 0; maxF = 0;
    }
    return { 
      cellDataMap: map, 
      minSuccessful: minS, maxSuccessful: maxS, 
      minFailed: minF, maxFailed: maxF 
    };
  }, [data]);


  if (!data || data.length === 0) {
    return <div className="text-center text-muted-foreground p-4">No timing data available.</div>;
  }

  const currentMinValue = selectedMetric === 'successfulForwards' ? minSuccessful : minFailed;
  const currentMaxValue = selectedMetric === 'successfulForwards' ? maxSuccessful : maxFailed;

  const indicatorRowCells: React.ReactNode[] = [];
  let currentHourIndicatorIndex = 0;
  while (currentHourIndicatorIndex < hours.length) {
    const hourValue = parseInt(hours[currentHourIndicatorIndex]);
    let regionProcessed = false;
    for (const region of regionalIndicators) {
      if (hourValue === region.start) {
        const span = region.end - region.start;
        indicatorRowCells.push(
          <Tooltip key={`region-indicator-${region.name}`}>
            <TooltipTrigger asChild>
              <div
                className="h-full p-1 text-xs text-center bg-muted/40 border border-border/60 flex items-center justify-center rounded-sm"
                style={{ gridColumn: `span ${span}` }}
              >
                {region.name}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{region.name} Late Afternoon</p>
              <p>UTC {String(region.start).padStart(2, '0')}:00 - {String(region.end - 1).padStart(2, '0')}:59</p>
            </TooltipContent>
          </Tooltip>
        );
        currentHourIndicatorIndex += span;
        regionProcessed = true;
        break;
      }
    }
    if (!regionProcessed) {
      indicatorRowCells.push(
        <div key={`empty-indicator-${hourValue}`} className="p-1 h-5 text-center bg-card" />
      );
      currentHourIndicatorIndex++;
    }
  }


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
        <div className="grid gap-px bg-border my-2" style={{ gridTemplateColumns: `auto repeat(${hours.length}, minmax(30px, 1fr))` }}>
          
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
          <div className="p-1 bg-card text-xs text-center font-medium text-muted-foreground flex items-center justify-center col-start-1">UTC</div>
          {indicatorRowCells}
        </div>
      </div>
       <CardDescription className="mt-2 text-xs">
        Heatmap visualizes forwarding activity from the last 8 weeks. Hours are in UTC. Cell color intensity (from white representing the minimum observed count for the selected metric to full orange for successful, or white to full purple for failed for the maximum observed count) indicates the volume. The bottom row highlights late afternoon periods in Asia, Europe, and America, displayed as merged cells spanning their respective UTC timeframes. Hover over cells for detailed counts.
      </CardDescription>
    </TooltipProvider>
  );
}
