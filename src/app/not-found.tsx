import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Frown } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
      <Frown className="h-16 w-16 text-primary mb-4" />
      <h1 className="text-4xl font-headline font-bold text-foreground mb-2">404 - Page Not Found</h1>
      <p className="text-muted-foreground mb-6 max-w-md">
        Sorry, the page you are looking for doesn't exist or has been moved.
      </p>
      <Link href="/">
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
          Go Back to Overview
        </Button>
      </Link>
    </div>
  );
}
