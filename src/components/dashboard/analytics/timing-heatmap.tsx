
'use client';

import type { HeatmapCell } from '@/lib/types';
import { Card, CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import React from 'react'; // Import React for React.Fragment

interface TimingHeatmapProps {
  data: HeatmapCell[];
}

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));

export function TimingHeatmap({ data }: TimingHeatmapProps) {
  if (!data || data.length === 0) {
    return <div className="text-center text-muted-foreground p-4">No timing data available.</div>;
  }
  
  // Create a map for quick lookup
  const intensityMap = new Map<string, number>();
  data.forEach(cell => {
    intensityMap.set(`${cell.day}-${cell.hour}`, cell.intensity);
  });

  const getIntensityColor = (intensity: number): string => {
    // Colors from globals.css theme (approximated for HSL)
    // Primary Purple: hsl(var(--primary)) which is 277 70% 36%
    // Secondary Orange: hsl(var(--secondary)) which is 34 100% 50%
    // White: hsl(0, 0%, 100%)
    const primaryPurple = { h: 277, s: 70, l: 36 };
    const secondaryOrange = { h: 34, s: 100, l: 50 };
    const white = { h: 0, s: 0, l: 100 }; // Standard white for midpoint

    let h, s, l;

    if (intensity <= 0.5) {
      // Interpolate from Purple (low intensity = 0) to White (mid intensity = 0.5)
      const t = intensity / 0.5; // Normalize intensity from 0 to 1 for this segment
      
      // Interpolate hue from purple to white (0 or any, as saturation will be 0)
      // To avoid hue jumping across 360/0, if white.h is 0 and purple.h is 277,
      // interpolate towards 360 instead of 0 for a smoother transition if needed, then normalize.
      // However, for white, hue doesn't matter when saturation is 0.
      let targetHueForWhite = white.h;
      if (primaryPurple.h > 180 && white.h < 180) targetHueForWhite = 360; // Go towards 360 if purple is on the higher side

      h = primaryPurple.h + (targetHueForWhite - primaryPurple.h) * t;
      s = primaryPurple.s + (white.s - primaryPurple.s) * t;
      l = primaryPurple.l + (white.l - primaryPurple.l) * t;
    } else {
      // Interpolate from White (mid intensity = 0.5) to Orange (high intensity = 1)
      const t = (intensity - 0.5) / 0.5; // Normalize intensity from 0 to 1 for this segment
      h = white.h + (secondaryOrange.h - white.h) * t;
      s = white.s + (secondaryOrange.s - white.s) * t;
      l = white.l + (secondaryOrange.l - white.l) * t;
    }
    
    h = (Math.round(h) % 360 + 360) % 360; // Normalize hue to be 0-359

    return `hsl(${h}, ${Math.round(s)}%, ${Math.round(l)}%)`;
  };


  return (
    <TooltipProvider>
      <div className="overflow-x-auto">
        <div className="grid gap-px bg-border my-2" style={{ gridTemplateColumns: `auto repeat(${hours.length}, minmax(0, 1fr))` }}>
          {/* Empty corner cell */}
          <div className="p-1 text-xs bg-card"></div>
          {/* Hour labels */}
          {hours.map(hour => (
            <div key={`hour-${hour}`} className="p-1 text-xs text-center font-medium bg-card text-muted-foreground">
              {hour}
            </div>
          ))}
          
          {/* Day rows */}
          {days.map((dayLabel, dayIndex) => (
            <React.Fragment key={`day-row-${dayIndex}`}>
              {/* Day label cell */}
              <div key={`daylabel-${dayIndex}`} className="p-1 text-xs text-center font-medium bg-card text-muted-foreground flex items-center justify-center">
                {dayLabel}
              </div>
              {/* Data cells for the current day */}
              {hours.map((hourLabel, hourIndex) => {
                const intensity = intensityMap.get(`${dayIndex}-${hourIndex}`) || 0;
                return (
                  <Tooltip key={`${dayIndex}-${hourIndex}`}>
                    <TooltipTrigger asChild>
                      <div
                        className="h-6 w-full rounded-sm" // Adjusted height
                        style={{ backgroundColor: getIntensityColor(intensity) }}
                        aria-label={`Traffic at ${dayLabel} ${hourLabel}:00, Intensity: ${intensity.toFixed(2)}`}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{dayLabel}, {hourLabel}:00 - {(parseInt(hourLabel)+1).toString().padStart(2, '0')}:00</p>
                      <p>Intensity: {intensity.toFixed(2)}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground mt-2">
        <span>Low Intensity</span>
        <div className="flex">
          {[0, 0.25, 0.5, 0.75, 1].map(i => (
            <div key={i} className="h-3 w-6 rounded-sm" style={{ backgroundColor: getIntensityColor(i) }} />
          ))}
        </div>
        <span>High Intensity</span>
      </div>
       <CardDescription className="mt-2 text-xs">
        Heatmap visualizes routing request intensity. Purple shades indicate lower activity, transitioning through white to orange shades for higher activity. Based on data from the last 8 weeks.
      </CardDescription>
    </TooltipProvider>
  );
}
