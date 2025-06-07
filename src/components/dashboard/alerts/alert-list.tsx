'use client';

import type { AlertSetting } from '@/lib/types';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Trash2, Edit3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';

interface AlertListProps {
  alerts: AlertSetting[];
}

export function AlertList({ alerts: initialAlerts }: AlertListProps) {
  const [alerts, setAlerts] = useState<AlertSetting[]>(initialAlerts);

  const toggleAlertStatus = (id: string) => {
    setAlerts(currentAlerts =>
      currentAlerts.map(alert =>
        alert.id === id ? { ...alert, isEnabled: !alert.isEnabled } : alert
      )
    );
    const updatedAlert = alerts.find(a => a.id === id);
    if(updatedAlert) {
        toast({
            title: `Alert ${updatedAlert.isEnabled ? 'Disabled' : 'Enabled'}`,
            description: `Alert for "${updatedAlert.metric}" is now ${updatedAlert.isEnabled ? 'inactive' : 'active'}.`
        })
    }
  };

  const deleteAlert = (id: string) => {
    const deletedAlert = alerts.find(a => a.id === id);
    setAlerts(currentAlerts => currentAlerts.filter(alert => alert.id !== id));
     if(deletedAlert) {
        toast({
            title: `Alert Deleted`,
            description: `Alert for "${deletedAlert.metric}" has been removed.`,
            variant: "destructive"
        })
    }
  }


  if (alerts.length === 0) {
    return <p className="text-muted-foreground text-center py-4">No alerts configured yet. Add one using the form.</p>;
  }

  return (
    <div className="overflow-x-auto">
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead className="text-right">Notify</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {alerts.map((alert) => (
                    <TableRow key={alert.id}>
                        <TableCell className="font-medium">{alert.metric}</TableCell>
                        <TableCell>
                            {alert.condition === 'above' ? `> ${alert.threshold}` : `< ${alert.threshold}`}
                        </TableCell>
                        <TableCell className="text-right">
                            <Badge variant="outline" className="capitalize">{alert.notificationChannel}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                            <Switch
                                checked={alert.isEnabled}
                                onCheckedChange={() => toggleAlertStatus(alert.id)}
                                aria-label={`Toggle alert for ${alert.metric}`}
                            />
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                             <Button variant="ghost" size="icon" aria-label="Edit alert" onClick={() => toast({title: "Edit Action", description: "Edit functionality to be implemented."})}>
                                <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" aria-label="Delete alert" onClick={() => deleteAlert(alert.id)} className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    </div>
  );
}
