'use server';

import type { KeyMetric, TimeSeriesData } from '@/lib/types';

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function fetchKeyMetrics(): Promise<KeyMetric[]> {
  await delay(500); // Simulate network latency

  // In a real application, you would fetch this data from your API:
  // const response = await fetch('/api/node/key-metrics');
  // if (!response.ok) {
  //   throw new Error('Failed to fetch key metrics');
  // }
  // const data = await response.json();
  // return data;

  // Returning mock-like data for now
  console.log("Fetching key metrics from server service...");
  return [
    { id: 'payments', title: 'Total Payments Processed', value: 12560, iconName: 'Zap', trend: 5.2 },
    { id: 'fees', title: 'Forwarding Fees Earned (sats)', value: 853020, iconName: 'Activity', trend: 12.1 },
    { id: 'uptime', title: 'Node Uptime', value: '99.98%', iconName: 'Clock', trend: 0.01 },
    { id: 'channels', title: 'Active Channels', value: 78, iconName: 'Network', trend: -2 },
  ];
}

export async function fetchHistoricalPaymentVolume(): Promise<TimeSeriesData[]> {
  await delay(800); // Simulate network latency

  // In a real application, you would fetch this data from your API:
  // const response = await fetch('/api/node/historical-payment-volume');
  // if (!response.ok) {
  //   throw new Error('Failed to fetch historical payment volume');
  // }
  // const data = await response.json();
  // return data;
  
  console.log("Fetching historical payment volume from server service...");
  // Returning mock-like data for now
  const generateTimeSeries = (days: number, startValue: number, fluctuation: number): TimeSeriesData[] => {
    const data: TimeSeriesData[] = [];
    let currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - days);
    for (let i = 0; i < days; i++) {
      data.push({
        date: currentDate.toISOString().split('T')[0],
        value: Math.max(0, startValue + (Math.random() - 0.5) * fluctuation * (i / 10)), // Adjusted fluctuation effect
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    return data;
  };
  return generateTimeSeries(30, 500000, 150000); // Increased fluctuation for more dynamic mock data
}
