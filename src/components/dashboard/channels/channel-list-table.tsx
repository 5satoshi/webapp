
'use client';

import type { Channel } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useState, useMemo } from 'react';
import { Progress } from "@/components/ui/progress";
import { ArrowUp, ArrowDown } from 'lucide-react';
import { ChannelDetailModal } from './channel-detail-modal'; // Import the modal
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface ChannelListTableProps {
  channels: Channel[];
}

type SortableChannelKeys = 'peerDisplay' | 'capacity' | 'localBalancePercent' | 'historicalPaymentSuccessRate' | 'status' | 'drain';

export function ChannelListTable({ channels: initialChannels }: ChannelListTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortableChannelKeys; direction: 'ascending' | 'descending' } | null>({ key: 'drain', direction: 'descending' });

  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleRowClick = (channel: Channel) => {
    setSelectedChannel(channel);
    setIsDetailModalOpen(true);
  };

  const filteredChannels = useMemo(() => {
    return initialChannels.filter(channel => {
      const term = searchTerm.toLowerCase();
      const nodeIdMatch = channel.peerNodeId.toLowerCase().includes(term);
      const aliasMatch = channel.peerAlias && channel.peerAlias.toLowerCase().includes(term);
      return nodeIdMatch || aliasMatch;
    });
  }, [initialChannels, searchTerm]);
  
  const sortedChannels = useMemo(() => {
    let sortableItems = [...filteredChannels];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: string | number | null | undefined = '';
        let bValue: string | number | null | undefined = '';

        switch (sortConfig.key) {
          case 'peerDisplay':
            aValue = (a.peerAlias || a.peerNodeId).toLowerCase();
            bValue = (b.peerAlias || b.peerNodeId).toLowerCase();
            break;
          case 'capacity':
            aValue = a.capacity;
            bValue = b.capacity;
            break;
          case 'localBalancePercent':
            const aTotal = a.localBalance + a.remoteBalance;
            aValue = aTotal > 0 ? (a.localBalance / aTotal) * 100 : 0;
            const bTotal = b.localBalance + b.remoteBalance;
            bValue = bTotal > 0 ? (b.localBalance / bTotal) * 100 : 0;
            break;
          case 'historicalPaymentSuccessRate':
            aValue = a.historicalPaymentSuccessRate;
            bValue = b.historicalPaymentSuccessRate;
            break;
          case 'status':
            aValue = a.status.toLowerCase();
            bValue = b.status.toLowerCase();
            break;
          case 'drain':
            aValue = a.drain ?? -Infinity;
            bValue = b.drain ?? -Infinity;
            break;
        }

        if (aValue === null || aValue === undefined) aValue = sortConfig.direction === 'ascending' ? Infinity : -Infinity;
        if (bValue === null || bValue === undefined) bValue = sortConfig.direction === 'ascending' ? Infinity : -Infinity;

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          if (aValue < bValue) {
            return sortConfig.direction === 'ascending' ? -1 : 1;
          }
          if (aValue > bValue) {
            return sortConfig.direction === 'ascending' ? 1 : -1;
          }
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          if (aValue < bValue) {
            return sortConfig.direction === 'ascending' ? -1 : 1;
          }
          if (aValue > bValue) {
            return sortConfig.direction === 'ascending' ? 1 : -1;
          }
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredChannels, sortConfig]);

  const requestSort = (key: SortableChannelKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnKey: SortableChannelKeys) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return null; 
    }
    if (sortConfig.direction === 'ascending') {
      return <ArrowUp className="ml-1 h-3 w-3" />;
    }
    return <ArrowDown className="ml-1 h-3 w-3" />;
  };
  
  const getStatusVariant = (status: Channel['status']) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'secondary';
      case 'pending':
        return 'outline';
      default:
        return 'default';
    }
  };
  
  const getPeerDisplay = (channel: Channel) => {
    return channel.peerAlias || `${channel.peerNodeId.substring(0,10)}...${channel.peerNodeId.substring(channel.peerNodeId.length - 10)}`;
  };


  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <CardTitle className="font-headline">Our Channels ({sortedChannels.length})</CardTitle>
            <Input 
              placeholder="Filter by Peer Alias or Node ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    onClick={() => requestSort('peerDisplay')} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center">
                      Peer Alias / Node ID {getSortIcon('peerDisplay')}
                    </div>
                  </TableHead>
                  <TableHead 
                    onClick={() => requestSort('capacity')} 
                    className="text-right cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-end">
                      Capacity (sats) {getSortIcon('capacity')}
                    </div>
                  </TableHead>
                  <TableHead 
                    onClick={() => requestSort('localBalancePercent')} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center">
                      Balance (Local/Remote %) {getSortIcon('localBalancePercent')}
                    </div>
                  </TableHead>
                  <TableHead 
                    onClick={() => requestSort('drain')} 
                    className="text-right cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                     <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                           <div className="flex items-center justify-end">
                            Drain {getSortIcon('drain')}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Positive values indicate inbound flow, negative values indicate outbound flow.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                  <TableHead 
                    onClick={() => requestSort('historicalPaymentSuccessRate')} 
                    className="text-right cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-end">
                      Success Rate {getSortIcon('historicalPaymentSuccessRate')}
                    </div>
                  </TableHead>
                  <TableHead 
                    onClick={() => requestSort('status')} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center">
                      Status {getSortIcon('status')}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedChannels.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No channels found matching your filter criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedChannels.map((channel) => {
                    const totalBalance = channel.localBalance + channel.remoteBalance;
                    const localBalancePercent = totalBalance > 0 ? (channel.localBalance / totalBalance) * 100 : 0;
                    const displayPeer = getPeerDisplay(channel);
                    const tooltipTitle = channel.peerAlias ? `${channel.peerAlias} (${channel.peerNodeId})` : channel.peerNodeId;
                    const drainValue = typeof channel.drain === 'number' ? channel.drain.toFixed(2) : 'N/A';
                    const drainColor = typeof channel.drain === 'number'
                      ? channel.drain > 0 ? 'text-green-600' : 'text-red-600'
                      : 'text-muted-foreground';

                    return (
                      <TableRow 
                        key={channel.id} 
                        onClick={() => handleRowClick(channel)}
                        className="cursor-pointer hover:bg-muted/80 transition-colors"
                      >
                        <TableCell className="font-medium truncate max-w-xs" title={tooltipTitle}>
                          {displayPeer}
                        </TableCell>
                        <TableCell className="text-right">{channel.capacity.toLocaleString('en-US')}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={localBalancePercent} className="w-20 h-2" />
                            <span>{localBalancePercent.toFixed(0)}%</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                              {channel.localBalance.toLocaleString('en-US')} / {channel.remoteBalance.toLocaleString('en-US')}
                          </div>
                        </TableCell>
                        <TableCell className={cn("text-right font-mono", drainColor)}>
                          {drainValue}
                        </TableCell>
                        <TableCell className="text-right">{channel.historicalPaymentSuccessRate.toFixed(1)}%</TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(channel.status)} className="capitalize">{channel.status}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {selectedChannel && (
        <ChannelDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          channelShortId={selectedChannel.shortChannelId}
          channelPeerDisplay={getPeerDisplay(selectedChannel)}
        />
      )}
    </>
  );
}
