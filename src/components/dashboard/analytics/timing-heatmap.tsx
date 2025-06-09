
'use client';

import type { HeatmapCell } from '@/lib/types';
import { Card, CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import React from 'react'; 

interface TimingHeatmapProps {
  data: HeatmapCell[];
}

// Sunday should be first to match BigQuery's DAYOFWEEK (1=Sun) being mapped to 0 for JS array
const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));

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

  const maxSuccessfulForwards = React.useMemo(() => {
    if (!data || data.length === 0) return 1; // Avoid division by zero, ensure intensity calculation works
    return Math.max(...data.map(cell => cell.successfulForwards), 0) || 1; // Ensure at least 1 if all are 0
  }, [data]);


  const getIntensityColor = (successfulForwards: number): string => {
    const intensity = maxSuccessfulForwards > 0 ? successfulForwards / maxSuccessfulForwards : 0;
    
    // Colors from globals.css theme (approximated for HSL)
    const primaryPurple = { h: 277, s: 70, l: 36 }; // hsl(var(--primary))
    const secondaryOrange = { h: 34, s: 100, l: 50 }; // hsl(var(--secondary))
    const white = { h: 0, s: 0, l: 100 };

    let h, s, l;

    if (intensity <= 0.5) {
      const t = intensity / 0.5; 
      h = primaryPurple.h + (white.h - primaryPurple.h) * t;
      s = primaryPurple.s + (white.s - primaryPurple.s) * t;
      l = primaryPurple.l + (white.l - primaryPurple.l) * t;
    } else {
      const t = (intensity - 0.5) / 0.5; 
      h = white.h + (secondaryOrange.h - white.h) * t;
      s = white.s + (secondaryOrange.s - white.s) * t;
      l = white.l + (secondaryOrange.l - white.l) * t;
    }
    
    h = (Math.round(h) % 360 + 360) % 360; 

    return `hsl(${h}, ${Math.round(s)}%, ${Math.round(l)}%)`;
  };


  if (!data || data.length === 0) {
    return <div className="text-center text-muted-foreground p-4">No timing data available.</div>;
  }

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
          
          {days.map((dayLabel, dayIndex) => ( // dayIndex is 0 (Sun) to 6 (Sat)
            <React.Fragment key={`day-row-${dayIndex}`}>
              <div key={`daylabel-${dayIndex}`} className="p-1 text-xs text-center font-medium bg-card text-muted-foreground flex items-center justify-center">
                {dayLabel}
              </div>
              {hours.map((hourLabel, hourIndex) => { // hourIndex is 0 to 23
                const cell = cellDataMap.get(`${dayIndex}-${hourIndex}`) || { successfulForwards: 0, failedForwards: 0 };
                const color = getIntensityColor(cell.successfulForwards);
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
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground mt-2">
        <span>Low Activity</span>
        <div className="flex">
          {[0, 0.25 * maxSuccessfulForwards, 0.5 * maxSuccessfulForwards, 0.75 * maxSuccessfulForwards, maxSuccessfulForwards].map((sFwd, i) => (
            <div key={i} className="h-3 w-6 rounded-sm" style={{ backgroundColor: getIntensityColor(sFwd) }} />
          ))}
        </div>
        <span>High Activity</span>
      </div>
       <CardDescription className="mt-2 text-xs">
        Heatmap visualizes successful forwarding activity. Purple shades indicate lower activity, transitioning through white to orange shades for higher activity. Based on data from the last 8 weeks.
      </CardDescription>
    </TooltipProvider>
  );
}
