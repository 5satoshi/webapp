
'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';

interface NodeSelectorFormProps {
  currentAggregation: string;
  initialNodeId: string;
}

export function NodeSelectorForm({ currentAggregation, initialNodeId }: NodeSelectorFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nodeIdInput, setNodeIdInput] = useState(initialNodeId);

  useEffect(() => {
    // Update input if initialNodeId prop changes (e.g. from URL)
    setNodeIdInput(initialNodeId);
  }, [initialNodeId]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const newParams = new URLSearchParams(searchParams.toString());
    if (nodeIdInput.trim()) {
      newParams.set('nodeId', nodeIdInput.trim());
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
        <Label htmlFor="nodeIdInput" className="mb-1.5 block text-sm font-medium text-muted-foreground">
          Enter Node ID (Public Key)
        </Label>
        <Input
          id="nodeIdInput"
          type="text"
          value={nodeIdInput}
          onChange={(e) => setNodeIdInput(e.target.value)}
          placeholder="e.g., 03xxxxxxxx..."
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
