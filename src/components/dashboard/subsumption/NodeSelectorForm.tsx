
'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';

interface NodeSelectorFormProps {
  currentAggregation: string;
  initialNodeId: string; // This can now be an ID or an alias from the URL
}

export function NodeSelectorForm({ currentAggregation, initialNodeId }: NodeSelectorFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nodeInput, setNodeInput] = useState(initialNodeId);

  useEffect(() => {
    // Update input if initialNodeId prop changes (e.g. from URL or parent re-render)
    setNodeInput(initialNodeId);
  }, [initialNodeId]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const newParams = new URLSearchParams(searchParams.toString());
    const trimmedInput = nodeInput.trim();

    if (trimmedInput) {
      newParams.set('nodeId', trimmedInput); // Keep param name as 'nodeId' for consistency
    } else {
      newParams.delete('nodeId'); // Remove if input is empty, defaulting to our node
    }
    // Ensure aggregation param is preserved or set
    newParams.set('aggregation', currentAggregation);

    router.push(`/subsumption?${newParams.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-end gap-3 mb-6">
      <div className="flex-grow w-full sm:w-auto">
        <Label htmlFor="nodeInput" className="mb-1.5 block text-sm font-medium text-muted-foreground">
          Enter Node ID or Alias
        </Label>
        <Input
          id="nodeInput"
          type="text"
          value={nodeInput}
          onChange={(e) => setNodeInput(e.target.value)}
          placeholder="e.g., 03xxxx... or MyNodeAlias"
          className="min-w-[200px] sm:min-w-[300px] md:min-w-[400px]"
        />
      </div>
      <Button type="submit" className="w-full sm:w-auto">
        <Search className="mr-2 h-4 w-4" />
        Load Node Data
      </Button>
    </form>
  );
}
