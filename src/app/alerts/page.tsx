import { PageTitle } from '@/components/ui/page-title';
import { AlertForm } from '@/components/dashboard/alerts/alert-form';
import { AlertList } from '@/components/dashboard/alerts/alert-list';
import { mockAlertSettings } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <PageTitle 
        title="Custom Alerts" 
        description="Configure notifications for critical events or performance issues related to your node." 
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Create New Alert</CardTitle>
                </CardHeader>
                <CardContent>
                    <AlertForm />
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-2">
            <Card>
                 <CardHeader>
                    <CardTitle className="font-headline">Configured Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                    <AlertList alerts={mockAlertSettings} />
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
