import type React from 'react';

interface PageTitleProps {
  title: string;
  description?: string;
  children?: React.ReactNode; // For actions like buttons
}

export function PageTitle({ title, description, children }: PageTitleProps) {
  return (
    <div className="mb-6 md:mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h1 className="text-2xl font-headline font-semibold text-foreground md:text-3xl">
          {title}
        </h1>
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground md:text-base">
          {description}
        </p>
      )}
    </div>
  );
}
