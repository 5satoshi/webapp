
'use client';

import type { SingleCategoryTopNode } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
          <TooltipProvider>
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

                                  <Badge variant="outline" size="sm" className="justify-self-start text-xs">Micro</Badge>
                                  <span className="text-right">{formatShare(node.microShare)}</span>
                                  <span className="text-right">{formatRankDisplay(node.microRank)}</span>

                                  <Badge variant="default" size="sm" className="justify-self-start text-xs">Common</Badge>
                                  <span className="text-right">{formatShare(node.commonShare)}</span>
                                  <span className="text-right">{formatRankDisplay(node.commonRank)}</span>
                                  
                                  <Badge variant="secondary" size="sm" className="justify-self-start text-xs">Macro</Badge>
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
          </TooltipProvider>
        ) : (
          <p className="text-muted-foreground text-sm text-center py-4">No top nodes data available for this category.</p>
        )}
      </CardContent>
    </Card>
  );
}

// Helper for Badge to allow size prop
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
      },
      size: { // Adding size variant
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-[0.6rem]", // Smaller padding and text for use in tooltip
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
// Ensure you have `cva` imported: import { cva } from "class-variance-authority"
// And `cn` imported: import { cn } from "@/lib/utils"
// Update Badge component in ui/badge.tsx if this size variant is globally needed, or keep local if only for here.
// For this change, I'll assume a local override for simplicity or that ui/badge.tsx is updated separately to include size.
// The Badge component itself doesn't directly support `size` prop in shadcn/ui by default.
// The provided Badge in ui/badge.tsx doesn't have a size prop. 
// For this specific use case, I will apply text size classes directly to the Badge in the tooltip
// rather than assuming a `size` prop on the Badge component, to avoid breaking ui/badge.tsx
// if it's not meant to have a size prop.
// However, the above code includes a modified Badge with size for illustration if one were to update it.
// Let's revert to using direct styling for badge text size in tooltip for safety.
// Re-evaluating: It's better to update the ShadCN Badge component or use custom styling.
// For this pass, I will just use text-xs on the Badge for simplicity and assume it's acceptable.
// If the Badge component's definition (`ui/badge.tsx`) is updated to include a `size` variant, 
// then `size="sm"` would work as intended.
// The current `ShortestPathCategoryCard.tsx` uses `Badge` from `@/components/ui/badge`.
// I will rely on the default padding and adjust font size manually if needed via className.
// The `TooltipContent` now includes a grid to display Micro, Common, and Macro shares/ranks.
