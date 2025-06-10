
'use client';

import type { SingleCategoryTopNode } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getOrdinalSuffix } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface ShortestPathCategoryCardProps {
  title: string;
  paymentSizeLabel: string;
  nodes: SingleCategoryTopNode[];
  categoryType: 'micro' | 'common' | 'macro';
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
    return node.alias; // CSS will handle truncation
  }
  // Fallback to formatted Node ID if no alias
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
          // <TooltipProvider> TooltipProvider removed from here
            <div className="overflow-x-auto"> {/* This div will scroll if table content is too wide */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30px] p-2 text-xs">#</TableHead>
                    <TableHead className="p-2 text-xs">Node</TableHead>
                    {/* Share for primary category shown in table, other shares in tooltip */}
                    <TableHead className="p-2 text-xs text-right md:hidden">Share ({title})</TableHead> 
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nodes.map((node, index) => (
                    <TableRow key={node.nodeid} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="p-2 text-sm">{index + 1}</TableCell>
                      <TableCell className="font-medium p-2 text-sm">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-default block truncate max-w-[18ch] md:max-w-[10ch] lg:max-w-[12ch] xl:max-w-[15ch]">
                                {getNodeDisplay(node)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" align="start" className="w-auto p-3 bg-popover text-popover-foreground shadow-md rounded-md border max-w-xs sm:max-w-sm">
                            <div className="space-y-1.5 text-sm text-left">
                                <div className="font-semibold truncate">{node.alias || 'Unknown Alias'}</div>
                                <div className="text-xs text-muted-foreground break-all">{node.nodeid}</div>
                                <Separator className="my-1.5 bg-border" />
                                <div className="grid grid-cols-[auto,1fr,1fr] gap-x-2 gap-y-0.5 items-center">
                                  <span/> {/* Empty for alignment */}
                                  <span className="text-xs font-medium text-muted-foreground text-right">Share</span>
                                  <span className="text-xs font-medium text-muted-foreground text-right">Rank</span>

                                  <Badge variant="outline" className="text-xs px-1.5 py-0.5 justify-self-start">Micro</Badge>
                                  <span className="text-right">{formatShare(node.microShare)}</span>
                                  <span className="text-right">{formatRankDisplay(node.microRank)}</span>

                                  <Badge variant="default" className="text-xs px-1.5 py-0.5 justify-self-start">Common</Badge>
                                  <span className="text-right">{formatShare(node.commonShare)}</span>
                                  <span className="text-right">{formatRankDisplay(node.commonRank)}</span>
                                  
                                  <Badge variant="secondary" className="text-xs px-1.5 py-0.5 justify-self-start">Macro</Badge>
                                  <span className="text-right">{formatShare(node.macroShare)}</span>
                                  <span className="text-right">{formatRankDisplay(node.macroRank)}</span>
                                </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-right p-2 text-sm md:hidden">{formatShare(node.categoryShare)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          // </TooltipProvider> TooltipProvider removed from here
        ) : (
          <p className="text-muted-foreground text-sm text-center py-4">No top nodes data available for this category.</p>
        )}
      </CardContent>
    </Card>
  );
}

// Helper for Badge to allow size prop
// The original cva for badgeVariants is in ui/badge.tsx. 
// We are using className to adjust text size directly on Badge instances in the tooltip for simplicity.
// If a `size` prop was added to the main Badge component, it could be used like:
// <Badge variant="outline" size="sm" ...>
// For now, custom styling like `className="text-xs px-1.5 py-0.5"` is applied.
// This ensures we don't assume changes to ui/badge.tsx.
