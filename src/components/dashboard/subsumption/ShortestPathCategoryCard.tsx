
'use client';

import type { SingleCategoryTopNode } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getOrdinalSuffix } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface ShortestPathCategoryCardProps {
  title: string;
  paymentSizeLabel: string;
  nodes: SingleCategoryTopNode[];
  categoryType: 'micro' | 'common' | 'macro'; // Keep for potential future styling based on type
}

const formatShare = (share: number | null): string => {
  if (share === null || share === undefined) return 'N/A';
  return `${(share * 100).toFixed(3)}%`;
};

const formatRankDisplay = (rank: number | null): string => {
  if (rank === null || rank === undefined) return 'N/A';
  return `${rank}${getOrdinalSuffix(rank)}`;
};

const getNodeDisplay = (node: SingleCategoryTopNode): string => {
  if (node.alias) {
    return node.alias.length > 20 ? `${node.alias.substring(0, 17)}...` : node.alias;
  }
  return `${node.nodeid.substring(0, 8)}...${node.nodeid.substring(node.nodeid.length - 8)}`;
};

export function ShortestPathCategoryCard({ title, paymentSizeLabel, nodes, categoryType }: ShortestPathCategoryCardProps) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex items-baseline gap-x-1.5">
            <CardTitle className="font-headline text-lg md:text-xl">{title}</CardTitle>
            <p className="text-sm text-muted-foreground">{paymentSizeLabel}</p>
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        {nodes.length > 0 ? (
          <TooltipProvider>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30px] p-2 text-xs">#</TableHead>
                    <TableHead className="p-2 text-xs">Node</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nodes.map((node, index) => (
                    <Tooltip key={node.nodeid}>
                      <TooltipTrigger asChild>
                        <TableRow className="cursor-default hover:bg-muted/50 transition-colors">
                          <TableCell className="p-2 text-sm">{index + 1}</TableCell>
                          <TableCell className="font-medium p-2 text-sm">
                            <span className="truncate block">
                                {getNodeDisplay(node)}
                            </span>
                          </TableCell>
                        </TableRow>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" align="center" className="w-auto p-3 bg-popover text-popover-foreground shadow-md rounded-md border">
                        <div className="space-y-1 text-sm text-left">
                            <div className="font-semibold">{node.alias || 'Unknown Alias'}</div>
                            <div className="text-xs text-muted-foreground break-all">{node.nodeid}</div>
                            <Separator className="my-1.5 bg-border" />
                            <div><strong>Share:</strong> {formatShare(node.share)}</div>
                            <div><strong>Network Rank ({title}):</strong> {formatRankDisplay(node.rank)}</div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TooltipProvider>
        ) : (
          <p className="text-muted-foreground text-sm text-center py-4">No top nodes data available for this category.</p>
        )}
      </CardContent>
    </Card>
  );
}
