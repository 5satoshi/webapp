
'use client';

import type { HeatmapCell } from '@/lib/types';
import { CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import React from 'react'; 

interface TimingHeatmapProps {
  data: HeatmapCell[];
}

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));

// HSL values for theme colors (approximated)
const primaryPurple = { h: 277, s: 70, l: 36 }; 
const secondaryOrange = { h: 34, s: 100, l: 50 };

const getIntensityColor = (
  successfulForwards: number, 
  failedForwards: number, 
  maxTotalForwardsInDataset: number
): string => {
  const totalForwards = successfulForwards + failedForwards;

  if (totalForwards === 0) {
    return 'hsl(0, 0%, 95%)'; // Very light gray for no activity
  }

  const successRate = successfulForwards / totalForwards;

  // Hue: Interpolate from purple (low success) to orange (high success)
  // To go from purple (277) to orange (34) clockwise:
  let hue = primaryPurple.h + ((secondaryOrange.h + 360) - primaryPurple.h) * successRate;
  hue = Math.round(hue % 360);

  // Intensity (total volume) affects Lightness and Saturation
  const normalizedTotalVolume = maxTotalForwardsInDataset > 0 ? totalForwards / maxTotalForwardsInDataset : 0;

  // Saturation: Lower for less volume, higher for more volume.
  const minSaturation = 30; // Min saturation to still show some hue
  const maxSaturation = 90; // Vibrant saturation
  const saturation = Math.round(minSaturation + (maxSaturation - minSaturation) * normalizedTotalVolume);

  // Lightness: Lighter for less volume, more standard color lightness for more volume.
  const minLightnessForColor = 55; // Good color visibility
  const maxLightnessForLowVolume = 95; // Almost white for very low volume
  const lightness = Math.round(maxLightnessForLowVolume - (maxLightnessForLowVolume - minLightnessForColor) * normalizedTotalVolume);

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

export function TimingHeatmap({ data }: TimingHeatmapProps) {
  const cellDataMap = React.useMemo(() => {
    const map = new Map<string, { successfulForwards: number; failedForwards: number }>();
    if (data) {
      data.forEach(cell => {
        map.set(`${cell.day}-${cell.hour}`, { 
          successfulForwards: cell.successfulForwards, 
          failedForwards: cell.failedForwards 
        });
      });
    }
    return map;
  }, [data]);

  const maxTotalForwardsInDataset = React.useMemo(() => {
    if (!data || data.length === 0) return 1; 
    return Math.max(...data.map(cell => cell.successfulForwards + cell.failedForwards), 0) || 1; 
  }, [data]);


  if (!data || data.length === 0) {
    return <div className="text-center text-muted-foreground p-4">No timing data available.</div>;
  }

  return (
    <TooltipProvider>
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
                const cell = cellDataMap.get(`${dayIndex}-${hourIndex}`) || { successfulForwards: 0, failedForwards: 0 };
                const color = getIntensityColor(cell.successfulForwards, cell.failedForwards, maxTotalForwardsInDataset);
                const currentTotalForwards = cell.successfulForwards + cell.failedForwards;
                const currentSuccessRate = currentTotalForwards > 0 ? (cell.successfulForwards / currentTotalForwards) * 100 : 0;

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
                      <p>Total Forwards: {currentTotalForwards.toLocaleString()}</p>
                      <p>Success Rate: {currentTotalForwards > 0 ? currentSuccessRate.toFixed(1) + '%' : 'N/A'}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
       <CardDescription className="mt-2 text-xs">
        Heatmap visualizes forwarding activity. Cell color intensity (from very light to more saturated) indicates the total number of forwards (successful + failed). The hue shifts from purple (lower success rate) to orange (higher success rate). Based on data from the last 8 weeks.
      </CardDescription>
    </TooltipProvider>
  );
}
