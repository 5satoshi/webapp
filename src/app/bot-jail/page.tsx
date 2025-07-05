import { ShieldAlert } from 'lucide-react';

export default function BotJailPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
      <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
      <h1 className="text-4xl font-headline font-bold text-foreground mb-2">Access Denied</h1>
      <p className="text-muted-foreground mb-6 max-w-md">
        Your request has been flagged as suspicious.
      </p>
      <p className="text-xs text-muted-foreground">
        If you believe this is an error, please contact the site administrator.
      </p>
    </div>
  );
}
