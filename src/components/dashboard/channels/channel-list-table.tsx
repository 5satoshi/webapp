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
import { Button } from '@/components/ui/button';
import { MoreHorizontal, ExternalLink, TriangleAlert } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

interface ChannelListTableProps {
  channels: Channel[];
}

export function ChannelListTable({ channels: initialChannels }: ChannelListTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredChannels = initialChannels.filter(channel => 
    channel.peerNodeId.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
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

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <CardTitle className="font-headline">Your Channels ({filteredChannels.length})</CardTitle>
          <Input 
            placeholder="Filter by Peer Node ID..." 
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
                <TableHead>Peer Node ID</TableHead>
                <TableHead className="text-right">Capacity (sats)</TableHead>
                <TableHead>Balance (Local/Remote %)</TableHead>
                <TableHead className="text-right">Success Rate</TableHead>
                <TableHead className="text-right">Uptime</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredChannels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No channels found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredChannels.map((channel) => {
                  const totalBalance = channel.localBalance + channel.remoteBalance;
                  const localBalancePercent = totalBalance > 0 ? (channel.localBalance / totalBalance) * 100 : 0;
                  return (
                    <TableRow key={channel.id}>
                      <TableCell className="font-medium truncate max-w-xs" title={channel.peerNodeId}>
                        {channel.peerNodeId.substring(0,10)}...{channel.peerNodeId.substring(channel.peerNodeId.length - 10)}
                      </TableCell>
                      <TableCell className="text-right">{channel.capacity.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                           <Progress value={localBalancePercent} className="w-20 h-2" />
                           <span>{localBalancePercent.toFixed(0)}%</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {channel.localBalance.toLocaleString()} / {channel.remoteBalance.toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{channel.historicalPaymentSuccessRate}%</TableCell>
                      <TableCell className="text-right">{channel.uptime}%</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(channel.status)} className="capitalize">{channel.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>
                              <ExternalLink className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <TriangleAlert className="mr-2 h-4 w-4" />
                              Adjust Fees
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              Close Channel
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
  );
}
