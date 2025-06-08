
'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Info } from 'lucide-react';
import type { ChannelDetails } from '@/lib/types';
import { fetchChannelDetails } from '@/services/nodeService';

interface ChannelDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelShortId: string | null;
  channelPeerDisplay: string | null; 
}

export function ChannelDetailModal({
  isOpen,
  onClose,
  channelShortId,
  channelPeerDisplay,
}: ChannelDetailModalProps) {
  const [details, setDetails] = useState<ChannelDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && channelShortId) {
      const loadDetails = async () => {
        setIsLoading(true);
        setError(null);
        setDetails(null);
        try {
          const fetchedDetails = await fetchChannelDetails(channelShortId);
          setDetails(fetchedDetails);
        } catch (e) {
          console.error('Failed to fetch channel details:', e);
          setError(e instanceof Error ? e.message : 'An unknown error occurred.');
        } finally {
          setIsLoading(false);
        }
      };
      loadDetails();
    }
  }, [isOpen, channelShortId]);

  const renderDetailItem = (label: string, value: string | number | null | undefined, unit?: string) => {
    const displayValue = value === null || value === undefined ? 'N/A' : String(value);
    return (
      <div className="grid grid-cols-2 gap-2 items-center py-1.5 border-b border-border/50 last:border-b-0">
        <Label htmlFor={label.toLowerCase().replace(/\s+/g, '-')} className="text-sm text-muted-foreground">
          {label}
        </Label>
        <span id={label.toLowerCase().replace(/\s+/g, '-')} className="text-sm font-medium text-right">
          {displayValue}
          {unit && displayValue !== 'N/A' ? ` ${unit}` : ''}
        </span>
      </div>
    );
  };
  
  const DetailSkeleton = () => (
    <div className="space-y-3">
      {[...Array(10)].map((_, i) => ( // Increased skeleton items for fees and peer policy
        <div key={i} className="grid grid-cols-2 gap-2 items-center">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/3 justify-self-end" />
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline">
            Channel Details: {channelPeerDisplay || 'Loading...'}
          </DialogTitle>
          <DialogDescription>
            Detailed statistics for channel {channelShortId || 'N/A'}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {isLoading && <DetailSkeleton />}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Fetching Details</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {!isLoading && !error && details && (
            <>
              {renderDetailItem('First Transaction', details.firstTxTimestamp)}
              {renderDetailItem('Last Transaction', details.lastTxTimestamp)}
              {renderDetailItem('Total Successful Transactions', details.totalTxCount.toLocaleString('en-US'))}
              
              <div className="pt-3">
                <h4 className="text-md font-semibold mb-1 font-headline">Incoming</h4>
                {renderDetailItem('Successful Count', details.inTxCount.toLocaleString('en-US'))}
                {renderDetailItem('Volume', details.inTxVolumeSats.toLocaleString('en-US'), 'sats')}
                {renderDetailItem('Success Rate', details.inSuccessRate.toFixed(1), '%')}
                {renderDetailItem("Peer's Fee Policy", details.peerFeePolicy)}
              </div>

              <div className="pt-3">
                 <h4 className="text-md font-semibold mb-1 font-headline">Outgoing</h4>
                {renderDetailItem('Successful Count', details.outTxCount.toLocaleString('en-US'))}
                {renderDetailItem('Volume', details.outTxVolumeSats.toLocaleString('en-US'), 'sats')}
                {renderDetailItem('Success Rate', details.outSuccessRate.toFixed(1), '%')}
              </div>

              <div className="pt-3">
                <h4 className="text-md font-semibold mb-1 font-headline">Fees</h4>
                {renderDetailItem('Total Fees Earned (via this channel)', details.totalFeesEarnedSats.toLocaleString('en-US'), 'sats')}
              </div>
            </>
          )}
          {!isLoading && !error && !details && channelShortId && (
             <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>No Details Available</AlertTitle>
                <AlertDescription>Could not retrieve specific details for this channel, or it has no transaction history.</AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
