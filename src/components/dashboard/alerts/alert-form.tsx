'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { PlusCircle } from 'lucide-react';

const alertSchema = z.object({
  metric: z.string().min(1, 'Metric is required'),
  threshold: z.coerce.number().min(0, 'Threshold must be positive'),
  condition: z.enum(['above', 'below']),
  notificationChannel: z.enum(['email', 'sms', 'app']),
});

type AlertFormData = z.infer<typeof alertSchema>;

const availableMetrics = [
  { value: 'node_uptime', label: 'Node Uptime (%)' },
  { value: 'channel_balance_sats', label: 'Channel Balance (sats)' },
  { value: 'forwarding_fees_daily_sats', label: 'Forwarding Fees Daily (sats)' },
  { value: 'active_channels_count', label: 'Active Channels Count' },
];

export function AlertForm() {
  const form = useForm<AlertFormData>({
    resolver: zodResolver(alertSchema),
    defaultValues: {
      metric: '',
      threshold: 0,
      condition: 'below',
      notificationChannel: 'email',
    },
  });

  const onSubmit = (data: AlertFormData) => {
    console.log('Alert data submitted:', data);
    toast({
      title: 'Alert Created',
      description: `Alert for "${availableMetrics.find(m => m.value === data.metric)?.label || data.metric}" has been set.`,
    });
    form.reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="metric"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Metric</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a metric" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableMetrics.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="condition"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Condition</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a condition" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="above">Goes Above</SelectItem>
                  <SelectItem value="below">Falls Below</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="threshold"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Threshold Value</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 99 or 100000" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notificationChannel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notify Via</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select notification channel" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS (Placeholder)</SelectItem>
                  <SelectItem value="app">In-App Notification</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full bg-cta-orange hover:bg-cta-orange/90 text-primary-foreground">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Alert
        </Button>
      </form>
    </Form>
  );
}
