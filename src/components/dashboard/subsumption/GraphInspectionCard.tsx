
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import NodeGraphVisualization from './NodeGraphVisualization';
import type { NodeGraphData } from '@/lib/types';
import { Share2 } from 'lucide-react';

interface GraphInspectionCardProps {
  initialGraphData: NodeGraphData | null;
  centralNodeId: string;
  displayName: string;
}

type LinkDisplayMode = 'all' | 'threshold';

const LINK_SHARE_THRESHOLD = 0.001; // 0.1%

export function GraphInspectionCard({ initialGraphData, centralNodeId, displayName }: GraphInspectionCardProps) {
  const [linkMode, setLinkMode] = useState<LinkDisplayMode>('threshold');

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div>
            <CardTitle className="font-headline flex items-center">
              <Share2 className="mr-2 h-6 w-6 text-primary" />
              Graph Inspection: {displayName}
            </CardTitle>
            <CardDescription>
              Visualizing connections for the selected node based on 'common' payment type.
              Nodes: Central, Top 3 (1st-degree by share), Top 3 (2nd-degree for each 1st-degree by share).
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2 pt-2 sm:pt-0">
            <Switch
              id="link-display-mode"
              checked={linkMode === 'all'}
              onCheckedChange={(checked) => setLinkMode(checked ? 'all' : 'threshold')}
              aria-label={`Switch to ${linkMode === 'all' ? `show links above ${LINK_SHARE_THRESHOLD * 100}% share` : 'show all links'}`}
            />
            <Label htmlFor="link-display-mode" className="text-sm">
              {linkMode === 'all' ? 'All Links' : `Links ≥ ${LINK_SHARE_THRESHOLD * 100}% Share`}
            </Label>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <NodeGraphVisualization
          rawGraphData={initialGraphData}
          centralNodeId={centralNodeId}
          linkDisplayMode={linkMode}
          shareThreshold={LINK_SHARE_THRESHOLD}
        />
      </CardContent>
    </Card>
  );
}

    