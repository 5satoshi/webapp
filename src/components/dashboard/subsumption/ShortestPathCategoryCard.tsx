
'use client';

import type { SingleCategoryTopNode } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getOrdinalSuffix } from '@/lib/utils';
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
    return node.alias.length > 20 ? `${node.alias.substring(0, 17)}...` : node.alias;
  }
  return `${node.nodeid.substring(0, 8)}...${node.nodeid.substring(node.nodeid.length - 8)}`;
};

export function ShortestPathCategoryCard({ title, paymentSizeLabel, nodes, categoryType }: ShortestPathCategoryCardProps) {
  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="font-headline text-lg md:text-xl">{title}</CardTitle>
        <CardDescription>{paymentSizeLabel}</CardDescription>
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
                    <TableHead className="text-right p-2 text-xs">Share</TableHead>
                    <TableHead className="text-right p-2 text-xs">Rank</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nodes.map((node, index) => (
                    <TableRow key={node.nodeid}>
                      <TableCell className="p-2 text-sm">{index + 1}</TableCell>
                      <TableCell className="font-medium p-2 text-sm">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-default truncate block max-w-[100px] xs:max-w-[120px] sm:max-w-none">{getNodeDisplay(node)}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-semibold">{node.alias || 'Unknown Alias'}</p>
                            <p className="text-xs text-muted-foreground">{node.nodeid}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell className="text-right p-2 text-sm">{formatShare(node.share)}</TableCell>
                      <TableCell className="text-right p-2 text-sm">
                        <Badge 
                          variant={categoryType === 'common' ? 'default' : categoryType === 'micro' ? 'outline' : 'secondary'} 
                          className="text-xs px-1.5 py-0.5"
                        >
                          {formatRankDisplay(node.rank)}
                        </Badge>
                      </TableCell>
                    </TableRow>
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
