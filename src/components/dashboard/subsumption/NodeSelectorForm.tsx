
'use client';

import { useState, useEffect, type FormEvent, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search, Loader2 } from 'lucide-react';
import { getNodeSuggestions, type NodeSuggestion } from '@/ai/flows/getNodeSuggestionsFlow';
import { cn } from '@/lib/utils';
import { getOrdinalSuffix } from '@/lib/utils';

function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };
  return debounced as (...args: Parameters<F>) => void; // Ensure void return for debounced function
}

interface NodeSelectorFormProps {
  currentAggregation: string;
  initialNodeId: string;
}

export function NodeSelectorForm({ currentAggregation, initialNodeId }: NodeSelectorFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nodeInput, setNodeInput] = useState(initialNodeId);

  const [suggestions, setSuggestions] = useState<NodeSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const fetchSuggestionsCallback = useCallback(async (searchTerm: string) => {
    if (searchTerm.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setIsLoadingSuggestions(true);
    try {
      const result = await getNodeSuggestions({ searchTerm });
      setSuggestions(result);
      setShowSuggestions(result.length > 0);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  const debouncedFetchSuggestions = useRef(debounce(fetchSuggestionsCallback, 300)).current;

  useEffect(() => {
    setNodeInput(initialNodeId);
  }, [initialNodeId]);

  useEffect(() => {
    if (nodeInput.trim().length >= 2 && document.activeElement === inputRef.current) {
      debouncedFetchSuggestions(nodeInput);
    } else if (document.activeElement !== inputRef.current) {
      // If input is not focused, don't show suggestions unless explicitly opened
    } else {
       setSuggestions([]); // Clear suggestions if input is too short
       setShowSuggestions(false);
    }
  }, [nodeInput, debouncedFetchSuggestions]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowSuggestions(false); // Hide suggestions on submit
    const newParams = new URLSearchParams(searchParams.toString());
    const trimmedInput = nodeInput.trim();

    if (trimmedInput) {
      newParams.set('nodeId', trimmedInput);
    } else {
      newParams.delete('nodeId');
    }
    newParams.set('aggregation', currentAggregation);
    router.push(`/subsumption?${newParams.toString()}`);
  };

  const handleSuggestionClick = (suggestion: NodeSuggestion) => {
    setNodeInput(suggestion.value);
    setSuggestions([]);
    setShowSuggestions(false);
    inputRef.current?.focus();
    // Consider auto-submitting or just letting user click the button
    // handleSubmit(new Event('submit') as any); // To auto-submit
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-end gap-3 mb-6">
      <div className="flex-grow w-full sm:w-auto relative">
        <Label htmlFor="nodeInput" className="mb-1.5 block text-sm font-medium text-muted-foreground">
          Enter Node ID or Alias
        </Label>
        <Input
          ref={inputRef}
          id="nodeInput"
          type="text"
          value={nodeInput}
          onChange={(e) => setNodeInput(e.target.value)}
          onFocus={() => {
            if (nodeInput.trim().length >= 2 && suggestions.length > 0) {
              setShowSuggestions(true);
            } else if (nodeInput.trim().length >=2) {
              debouncedFetchSuggestions(nodeInput);
            }
          }}
          placeholder="e.g., 03xxxx... or MyNodeAlias"
          className="min-w-[200px] sm:min-w-[300px] md:min-w-[400px]"
          autoComplete="off"
        />
        {isLoadingSuggestions && (
          <Loader2 className="absolute right-3 top-[calc(50%_-_0.5rem_+_0.375rem)] h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 mt-1 w-full rounded-md border bg-background shadow-lg max-h-60 overflow-y-auto"
          >
            <ul className="py-1">
              {suggestions.map((suggestion, index) => (
                <li
                  key={`${suggestion.value}-${index}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-3 py-2 text-sm hover:bg-accent focus:bg-accent cursor-pointer flex justify-between items-center group"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleSuggestionClick(suggestion);
                    }
                  }}
                >
                  <span className="truncate group-hover:text-accent-foreground">
                    {suggestion.display}
                    {suggestion.rank !== null && suggestion.rank !== undefined && (
                      <span className="text-xs text-muted-foreground ml-1">
                        (Rank: {suggestion.rank}{getOrdinalSuffix(suggestion.rank)})
                      </span>
                    )}
                  </span>
                  <span className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full ml-2 shrink-0",
                    suggestion.type === 'alias' ? 'bg-primary/10 text-primary group-hover:bg-primary/20' : 'bg-secondary/10 text-secondary group-hover:bg-secondary/20'
                  )}>
                    {suggestion.type}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <Button type="submit" className="w-full sm:w-auto">
        <Search className="mr-2 h-4 w-4" />
        Load Node Data
      </Button>
    </form>
  );
}
