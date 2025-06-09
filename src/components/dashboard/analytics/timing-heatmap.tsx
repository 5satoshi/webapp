
'use client';

import type { HeatmapCell } from '@/lib/types';
import { CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React, { useState, useMemo, useEffect } from 'react';

interface TimingHeatmapProps {
  data: HeatmapCell[];
}

const allDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const allHours = Array.from({ length: 24 }, (_, i) => i); // 0-23

const ORANGE_HUE = 34; // hsl(var(--secondary))
const ORANGE_SATURATION_TARGET = 100;
const ORANGE_LIGHTNESS_TARGET = 50;

const PURPLE_HUE = 277; // hsl(var(--primary))
const PURPLE_SATURATION_TARGET = 70;
const PURPLE_LIGHTNESS_TARGET = 36;

const BASE_SATURATION_MIN = 20; // For nearly white cells
const BASE_LIGHTNESS_MAX = 97; // For nearly white cells

const MOBILE_LAYOUT_BREAKPOINT = 384; // New breakpoint for axis swap

const regionalIndicators = [
  { name: 'Asia', start: 6, end: 12, label: 'AS' },    // 06:00-11:59 UTC
  { name: 'Europe', start: 13, end: 19, label: 'EU' }, // 13:00-18:59 UTC
  { name: 'America', start: 19, end: 24, label: 'US' }, // 19:00-23:59 UTC
].sort((a, b) => a.start - b.start);


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

  if (maxValueForMetric === minValueForMetric) {
    // If all values are the same (or only one data point),
    // show white if zero, or full intensity if non-zero.
    if (currentValue === 0) {
      return `hsl(${hue}, ${BASE_SATURATION_MIN}%, ${BASE_LIGHTNESS_MAX}%)`;
    }
    return `hsl(${hue}, ${targetSaturation}%, ${targetLightness}%)`;
  }
  
  // Ensure minValueForMetric isn't greater than maxValueForMetric if dataset is very small or all zeros
  const effectiveMin = Math.min(minValueForMetric, maxValueForMetric);
  const range = maxValueForMetric - effectiveMin;

  let normalized = 0;
  if (currentValue <= effectiveMin) {
      normalized = 0;
  } else if (range > 0) {
    normalized = (currentValue - effectiveMin) / range;
  } else { // Should only happen if effectiveMin == maxValueForMetric
    normalized = (currentValue > 0 || maxValueForMetric > 0) ? 1 : 0;
  }
  
  normalized = Math.max(0, Math.min(1, normalized)); // Clamp between 0 and 1

  const saturation = Math.round(BASE_SATURATION_MIN + normalized * (targetSaturation - BASE_SATURATION_MIN));
  const lightness = Math.round(BASE_LIGHTNESS_MAX - normalized * (BASE_LIGHTNESS_MAX - targetLightness));

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

export function TimingHeatmap({ data }: TimingHeatmapProps) {
  const [selectedMetric, setSelectedMetric] = useState<'successfulForwards' | 'failedForwards'>('successfulForwards');
  const [isMobileLayout, setIsMobileLayout] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileLayout(window.innerWidth < MOBILE_LAYOUT_BREAKPOINT);
    };
    if (typeof window !== 'undefined') {
      handleResize(); // Set initial state
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);


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
      // Ensure min/max are at least 0 if all data points are 0 or no data
      if (minS === Infinity) minS = 0;
      if (maxS === -Infinity) maxS = 0; else if (maxS < minS) maxS = minS;
      if (minF === Infinity) minF = 0;
      if (maxF === -Infinity) maxF = 0; else if (maxF < minF) maxF = minF;

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

  const rowIterationSource = isMobileLayout ? allHours : allDays;
  const colIterationSource = isMobileLayout ? allDays : allHours;

  const rowLabels = isMobileLayout ? allHours.map(h => h.toString().padStart(2, '0')) : allDays;
  const colLabels = isMobileLayout ? allDays : allHours.map(h => h.toString().padStart(2, '0'));

  const heatmapGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `min-content repeat(${colLabels.length}, minmax(0, 1fr))`,
    gap: '1px',
    backgroundColor: 'hsl(var(--card))', // Use card background for "white" grid lines
  };
  
  const regionalIndicatorCells: React.ReactNode[] = [];
  let currentHourIndicatorIndex = 0;
  while (currentHourIndicatorIndex < allHours.length) {
    const hourValue = allHours[currentHourIndicatorIndex];
    let regionProcessed = false;
    for (const region of regionalIndicators) {
      if (hourValue === region.start) {
        const span = region.end - region.start;
        regionalIndicatorCells.push(
          <Tooltip key={`region-indicator-${region.name}`}>
            <TooltipTrigger asChild>
              <div
                className="h-full p-1 text-xs text-center text-muted-foreground bg-card flex items-center justify-center rounded-sm"
                style={{ gridColumn: `span ${span}` }}
              >
                {region.name}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{region.name} Late Afternoon</p>
              <p>UTC {String(region.start).padStart(2, '0')}:00 - {String(region.end -1).padStart(2, '0')}:59</p>
            </TooltipContent>
          </Tooltip>
        );
        currentHourIndicatorIndex += span;
        regionProcessed = true;
        break;
      }
    }
    if (!regionProcessed) {
      regionalIndicatorCells.push(
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
      
      <div className="w-full overflow-hidden"> 
        <div className="grid my-2" style={heatmapGridStyle}>
          <div className="p-1 bg-card flex items-center justify-center" />

          {colLabels.map((label, idx) => (
            <div key={`col-header-${idx}`} className="p-1 text-xs text-center font-medium bg-card text-muted-foreground flex items-center justify-center">
              {label}
            </div>
          ))}

          {rowIterationSource.map((_, rowIndex) => (
            <React.Fragment key={`heatmap-data-row-${rowIndex}`}>
              <div className="p-1 text-xs text-center font-medium bg-card text-muted-foreground flex items-center justify-center">
                {rowLabels[rowIndex]}
              </div>

              {colIterationSource.map((_, colIndex) => {
                const dayIndex = isMobileLayout ? colIndex : rowIndex;
                const hourValue = isMobileLayout ? rowIndex : colIndex; 

                const cell = cellDataMap.get(`${dayIndex}-${hourValue}`) || { day: dayIndex, hour: hourValue, successfulForwards: 0, failedForwards: 0 };
                const valueForMetric = cell[selectedMetric];
                const color = getCellColor(valueForMetric, currentMinValue, currentMaxValue, selectedMetric);
                
                const dayLabelForTooltip = allDays[dayIndex];
                const hourLabelForTooltip = allHours[hourValue].toString().padStart(2, '0');
                const totalForwards = cell.successfulForwards + cell.failedForwards;
                const successRate = totalForwards > 0 ? (cell.successfulForwards / totalForwards) * 100 : 0;

                return (
                  <Tooltip key={`cell-${dayIndex}-${hourValue}`}>
                    <TooltipTrigger asChild>
                      <div
                        className="w-full h-full rounded-sm" // Removed aspect-square
                        style={{ backgroundColor: color, minHeight: '1.5rem' }} // Added min-height for very small screens
                        aria-label={`Data for ${dayLabelForTooltip} ${hourLabelForTooltip}:00`}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">{dayLabelForTooltip}, {hourLabelForTooltip}:00 - {(parseInt(hourLabelForTooltip)+1).toString().padStart(2, '0')}:00 UTC</p>
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

      <div className="grid mt-1" style={{ gridTemplateColumns: `min-content repeat(${allHours.length}, minmax(0, 1fr))` }}>
        <div className="p-1 bg-card text-xs text-muted-foreground flex items-center justify-center">
           {isMobileLayout ? 'Regions' : 'UTC'}
        </div>
        {regionalIndicatorCells}
      </div>

      <CardDescription className="mt-2 text-xs">
        Heatmap visualizes forwarding activity from the last 8 weeks. Cell color intensity (from white to orange for successful, or white to purple for failed, relative to observed min/max for that metric) indicates the volume. 
        On screens narrower than {MOBILE_LAYOUT_BREAKPOINT}px, axes are swapped: hours are vertical, days horizontal. Cells expand to fill available space.
        The bottom row highlights late afternoon periods in Asia, Europe, and America (UTC-based). Hover over cells for detailed counts.
      </CardDescription>
    </TooltipProvider>
  );
}
