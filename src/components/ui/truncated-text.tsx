
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TruncatedTextProps {
  text: string;
  charLimit: number;
  className?: string;
}

export function TruncatedText({ text, charLimit, className }: TruncatedTextProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (text.length <= charLimit) {
    return <p className={cn("text-sm text-muted-foreground", className)}>{text}</p>;
  }

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={cn("text-sm text-muted-foreground", className)}>
      <p>
        {isExpanded ? text : `${text.substring(0, charLimit)}...`}
      </p>
      <Button
        variant="link"
        onClick={toggleExpand}
        className="px-0 py-1 h-auto text-xs text-primary hover:text-primary/80"
      >
        {isExpanded ? (
          <>
            Show Less <ChevronUp className="ml-1 h-3 w-3" />
          </>
        ) : (
          <>
            Show More <ChevronDown className="ml-1 h-3 w-3" />
          </>
        )}
      </Button>
    </div>
  );
}
