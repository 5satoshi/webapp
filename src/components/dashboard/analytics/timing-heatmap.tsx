
'use client';

import type { HeatmapCell } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React, { useState, useMemo, useEffect } from 'react';

interface TimingHeatmapProps {
  data: HeatmapCell[];
}

const ALL_DAYS_ORDERED = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; // Sunday as 0
const ALL_HOURS_NUMERIC = Array.from({ length: 24 }, (_, i) => i); // 0-23

const ORANGE_HUE = 34; // hsl(var(--secondary))
const ORANGE_SATURATION_TARGET = 100;
const ORANGE_LIGHTNESS_TARGET = 50;

const PURPLE_HUE = 277; // hsl(var(--primary))
const PURPLE_SATURATION_TARGET = 70;
const PURPLE_LIGHTNESS_TARGET = 36;

const BASE_SATURATION_MIN = 20;
const BASE_LIGHTNESS_MAX = 97; // Represents "white" or very light color

const MOBILE_LAYOUT_BREAKPOINT = 461; // Changed from 384

const regionalIndicatorsConfig = [
  { name: 'Asia', start: 6, end: 12 },    // 06:00-11:59 UTC
  { name: 'Europe', start: 13, end: 19 }, // 13:00-18:59 UTC
  { name: 'America', start: 19, end: 24 }, // 19:00-23:59 UTC
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
    // All values are the same. If that value is 0, make it white. Otherwise, full intensity.
    return currentValue === 0 
      ? `hsl(${hue}, ${BASE_SATURATION_MIN}%, ${BASE_LIGHTNESS_MAX}%)` 
      : `hsl(${hue}, ${targetSaturation}%, ${targetLightness}%)`;
  }

  // Ensure minValueForMetric isn't greater than maxValueForMetric if dataset is very small
  const effectiveMin = Math.min(minValueForMetric, maxValueForMetric);
  const range = maxValueForMetric - effectiveMin;

  let normalized = 0;
  if (currentValue <= effectiveMin) { // Catches values at or below min, including min itself
    normalized = 0;
  } else if (range > 0) {
    normalized = (currentValue - effectiveMin) / range;
  } else { // Should only happen if effectiveMin == maxValueForMetric (and not zero)
    normalized = 1; 
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
      handleResize();
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
      // Handle cases where all values are 0 or only one data point exists
      minS = minS === Infinity ? 0 : minS;
      maxS = maxS === -Infinity ? 0 : maxS;
      minF = minF === Infinity ? 0 : minF;
      maxF = maxF === -Infinity ? 0 : maxF;
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

  const rowIterationSource = isMobileLayout ? ALL_HOURS_NUMERIC : ALL_DAYS_ORDERED;
  const colIterationSource = isMobileLayout ? ALL_DAYS_ORDERED : ALL_HOURS_NUMERIC;

  const rowLabels = isMobileLayout ? ALL_HOURS_NUMERIC.map(h => h.toString().padStart(2, '0')) : ALL_DAYS_ORDERED;
  const colLabels = isMobileLayout ? ALL_DAYS_ORDERED : ALL_HOURS_NUMERIC.map(h => h.toString().padStart(2, '0'));
  
  const topLeftLabel = isMobileLayout ? "Hour" : "UTC";

  const heatmapGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `min-content repeat(${colLabels.length}, minmax(0, 1fr))`,
    gap: '1px',
    backgroundColor: 'hsl(var(--card))', // Changed from border to card for white background
  };
  
  const regionalIndicatorCells: React.ReactNode[] = [];
  if (!isMobileLayout) { // Only prepare these for desktop layout
    let currentHourIndicatorIndex = 0;
    while (currentHourIndicatorIndex < ALL_HOURS_NUMERIC.length) {
      const hourValue = ALL_HOURS_NUMERIC[currentHourIndicatorIndex];
      let regionProcessed = false;
      for (const region of regionalIndicatorsConfig) {
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
          <div className="p-1 text-xs text-center font-medium bg-card text-muted-foreground flex items-center justify-center">
            {topLeftLabel}
          </div>

          {colLabels.map((label, idx) => (
            <div key={`col-header-${idx}`} className="p-1 text-xs text-center font-medium bg-card text-muted-foreground flex items-center justify-center">
              {label}
            </div>
          ))}

          {rowIterationSource.map((_, rowIndex) => (
            <React.Fragment key={`heatmap-data-row-${rowIndex}`}>
              <div className="p-1 text-xs text-center font-medium bg-card text-muted-foreground flex items-center justify-center" style={{minHeight: isMobileLayout ? '1.5rem' : 'auto'}}>
                {rowLabels[rowIndex]}
              </div>

              {colIterationSource.map((_, colIndex) => {
                const dayValue = isMobileLayout ? colIndex : ALL_DAYS_ORDERED.indexOf(rowLabels[rowIndex] as string);
                const hourValue = isMobileLayout ? parseInt(rowLabels[rowIndex] as string) : parseInt(colLabels[colIndex] as string);

                const cell = cellDataMap.get(`${dayValue}-${hourValue}`) || { day: dayValue, hour: hourValue, successfulForwards: 0, failedForwards: 0 };
                const valueForMetric = cell[selectedMetric];
                const color = getCellColor(valueForMetric, currentMinValue, currentMaxValue, selectedMetric);
                
                const dayLabelForTooltip = ALL_DAYS_ORDERED[dayValue];
                const hourLabelForTooltip = ALL_HOURS_NUMERIC[hourValue].toString().padStart(2, '0');
                const totalForwards = cell.successfulForwards + cell.failedForwards;
                const successRate = totalForwards > 0 ? (cell.successfulForwards / totalForwards) * 100 : 0;

                return (
                  <Tooltip key={`cell-${dayValue}-${hourValue}`}>
                    <TooltipTrigger asChild>
                      <div
                        className="w-full h-full rounded-sm" // Removed aspect-square
                        style={{ backgroundColor: color, minHeight: '1.5rem' }}
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

      {!isMobileLayout && regionalIndicatorCells.length > 0 && (
        <div className="grid mt-1" style={{ 
            gridTemplateColumns: `min-content repeat(${ALL_HOURS_NUMERIC.length}, minmax(0, 1fr))`,
            // No gap or bg-border for this row (white background implied by card)
          }}>
          {/* Spacer cell to align with the Day/Hour labels column of the heatmap above it. */}
          <div className="p-1 bg-card text-xs text-muted-foreground flex items-center justify-center">
            {/* This could be empty or label this row e.g. "Regions" */}
          </div>
          {regionalIndicatorCells}
        </div>
      )}
    </TooltipProvider>
  );
}

