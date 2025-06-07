'use client';

import type { HeatmapCell } from '@/lib/types';
import { Card, CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

  const getIntensityColor = (intensity: number) => {
    const hue = 262; // Primary color hue (Deep Purple)
    const saturation = 52; // Primary color saturation
    const lightness = 13 + (98 - 13) * intensity * 0.8; // Dark gray (13%) to lighter purple (max ~80% of foreground lightness)
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
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
            <>
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
            </>
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
        Heatmap visualizes routing request intensity. Darker shades indicate lower activity, lighter shades indicate higher activity. Based on data from the last 8 weeks.
      </CardDescription>
    </TooltipProvider>
  );
}
