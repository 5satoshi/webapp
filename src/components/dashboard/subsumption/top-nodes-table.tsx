
'use client';

import type { TopNodeSubsumptionEntry } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getOrdinalSuffix } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TopNodesTableProps {
  nodes: TopNodeSubsumptionEntry[];
}

const formatShare = (share: number | null): string => {
  if (share === null || share === undefined) return 'N/A';
  return `${(share * 100).toFixed(3)}%`;
};

const formatRank = (rank: number | null): string => {
  if (rank === null || rank === undefined) return 'N/A';
  return `${rank}${getOrdinalSuffix(rank)}`;
};

const getNodeDisplay = (node: TopNodeSubsumptionEntry): string => {
  if (node.alias) {
    return node.alias.length > 20 ? `${node.alias.substring(0, 17)}...` : node.alias;
  }
  return `${node.nodeid.substring(0, 8)}...${node.nodeid.substring(node.nodeid.length - 8)}`;
};

export function TopNodesTable({ nodes }: TopNodesTableProps) {
  if (!nodes || nodes.length === 0) {
    return <p className="text-muted-foreground text-center py-4">No top node data available.</p>;
  }

  return (
    <TooltipProvider>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Node</TableHead>
              <TableHead className="text-center">Micro (200sat)</TableHead>
              <TableHead className="text-center">Common (50ksat)</TableHead>
              <TableHead className="text-center">Macro (4Msat)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {nodes.map((node, index) => (
              <TableRow key={node.nodeid}>
                <TableCell className="font-medium">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-default">{index + 1}. {getNodeDisplay(node)}</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-semibold">{node.alias || 'Unknown Alias'}</p>
                      <p className="text-xs text-muted-foreground">{node.nodeid}</p>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-center">
                  <div>{formatShare(node.micro_share)}</div>
                  <Badge variant="outline" className="mt-1 text-xs">{formatRank(node.micro_rank)}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <div>{formatShare(node.common_share)}</div>
                  <Badge variant="default" className="mt-1 text-xs">{formatRank(node.common_rank)}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <div>{formatShare(node.macro_share)}</div>
                  <Badge variant="secondary" className="mt-1 text-xs">{formatRank(node.macro_rank)}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
