
'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { NodeGraphData, GraphNode, GraphLink as AppGraphLink } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { ForceGraphMethods, LinkObject, NodeObject as FGNodeObject } from 'react-force-graph-2d';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px] w-full" />,
});

interface NodeGraphVisualizationProps {
  rawGraphData: NodeGraphData | null;
  centralNodeId: string;
  linkDisplayMode: 'all' | 'threshold';
  shareThreshold: number;
}

const MIN_VISUAL_WIDTH = 0.5;
const MAX_VISUAL_WIDTH = 6.0;

const NodeGraphVisualization: React.FC<NodeGraphVisualizationProps> = ({
  rawGraphData,
  centralNodeId,
  linkDisplayMode,
  shareThreshold,
}) => {
  const graphRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraphMethods>();
  const [dimensions, setDimensions] = useState({ width: 0, height: 400 });
  const [hasMounted, setHasMounted] = useState(false);
  const [resolvedLinkTextColor, setResolvedLinkTextColor] = useState('rgba(50, 50, 50, 0.9)');

  const linkColor = 'hsla(240, 3.8%, 46.1%, 0.3)';

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && hasMounted) {
      const style = getComputedStyle(document.documentElement);
      const fgColorParts = style.getPropertyValue('--foreground').trim().split(" ");
      if (fgColorParts.length === 3) {
         setResolvedLinkTextColor(`hsl(${fgColorParts[0]}, ${fgColorParts[1]}, ${fgColorParts[2]})`);
      } else {
        const bodyColor = getComputedStyle(document.body).color;
        setResolvedLinkTextColor(bodyColor || 'rgba(50, 50, 50, 0.9)');
      }
    }
  }, [hasMounted]);

  useEffect(() => {
    const currentGraphRef = graphRef.current;
    if (currentGraphRef && hasMounted) {
      const handleResize = () => {
        if (graphRef.current) {
          setDimensions({
            width: graphRef.current.offsetWidth,
            height: 400,
          });
        }
      };
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [hasMounted]);

  const {
    nodes: finalNodes,
    links: finalLinks,
    minVisibleShare,
    maxVisibleShare,
  } = useMemo(() => {
    if (!rawGraphData || !rawGraphData.nodes) {
      return { nodes: [], links: [], minVisibleShare: 0, maxVisibleShare: 0 };
    }

    let currentLinks = rawGraphData.links || [];
    if (linkDisplayMode === 'threshold') {
      currentLinks = currentLinks.filter(link => link.value >= shareThreshold);
    }
    
    const participatingNodeIds = new Set<string>([centralNodeId]);
    currentLinks.forEach(link => {
      participatingNodeIds.add(link.source);
      participatingNodeIds.add(link.target);
    });

    let currentNodes = rawGraphData.nodes.filter(node => participatingNodeIds.has(node.id));
    
    if (currentNodes.length === 0) {
        const central = rawGraphData.nodes.find(n => n.id === centralNodeId);
        if (central) {
            currentNodes = [central];
        }
    }
    
    let minS = Infinity;
    let maxS = -Infinity;

    if (currentLinks.length > 0) {
      currentLinks.forEach(link => {
        minS = Math.min(minS, link.value);
        maxS = Math.max(maxS, link.value);
      });
    } else {
      minS = 0; // Default if no links or all filtered out
      maxS = 0;
    }
    // If minS/maxS remained at their initial Infinity values (e.g. no valid links)
    if (minS === Infinity) minS = 0;
    if (maxS === -Infinity) maxS = 0;


    return {
      nodes: currentNodes,
      links: currentLinks,
      minVisibleShare: minS,
      maxVisibleShare: maxS,
    };
  }, [rawGraphData, linkDisplayMode, shareThreshold, centralNodeId]);


  const getNodeColor = useCallback((node: GraphNode) => {
    return node.color || 'hsl(288, 48%, 60%)'; // Fallback accent
  }, []);

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    if (graphRef.current) {
      graphRef.current.style.cursor = node ? 'pointer' : '';
    }
  }, []);

  const handleNodeClick = useCallback((node: GraphNode) => {
    if (fgRef.current) {
      const fgNode = node as FGNodeObject;
      if (typeof fgNode.x === 'number' && typeof fgNode.y === 'number') {
        fgRef.current.centerAt(fgNode.x, fgNode.y, 1000);
        fgRef.current.zoom(2.5, 1000);
      }
    }
    console.log("Clicked node:", node.name, "ID:", node.id);
  }, []);


  if (!hasMounted) {
    return <Skeleton className="h-[400px] w-full" />;
  }
  
  if (!rawGraphData) {
     return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Graph Data Not Available</AlertTitle>
        <AlertDescription>
          Could not retrieve initial graph data for {centralNodeId ? `${centralNodeId.substring(0, 10)}...` : 'the selected node'}.
        </AlertDescription>
      </Alert>
    );
  }

  if (finalNodes.length === 0) {
     const modeText = linkDisplayMode === 'threshold' ? `with share >= ${shareThreshold*100}%` : "for all selected nodes";
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>No Graph Elements to Display</AlertTitle>
        <AlertDescription>
          No nodes or links match the current criteria ({modeText}) for {centralNodeId ? `${centralNodeId.substring(0, 10)}...` : 'the selected node'}. Try adjusting the filter.
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div ref={graphRef} className="w-full h-[400px] rounded-lg border bg-card relative overflow-hidden">
      {dimensions.width > 0 && (
        <ForceGraph2D
          ref={fgRef}
          graphData={{ nodes: finalNodes, links: finalLinks }}
          width={dimensions.width}
          height={dimensions.height}
          nodeId="id"
          nodeVal="val"
          nodeLabel="name"
          nodeColor={getNodeColor}
          nodeRelSize={4}
          linkColor={() => linkColor}
          linkWidth={(linkInput) => {
            const link = linkInput as AppGraphLink;
            if (finalLinks.length === 0) {
              return MIN_VISUAL_WIDTH;
            }
            // If all shares are the same (or only one link), use a medium width.
            // maxVisibleShare could be 0 if all shares are 0.
            if (minVisibleShare === maxVisibleShare) {
              // If share is 0, use min width, otherwise medium.
              return maxVisibleShare > 0 ? (MIN_VISUAL_WIDTH + MAX_VISUAL_WIDTH) / 2 : MIN_VISUAL_WIDTH;
            }
          
            // Normalize the link's value within the range of visible shares
            const range = maxVisibleShare - minVisibleShare;
            // Handle range being zero to prevent division by zero if not caught above
            const normalizedValue = range === 0 ? 0.5 : (link.value - minVisibleShare) / range; 
            const width = MIN_VISUAL_WIDTH + normalizedValue * (MAX_VISUAL_WIDTH - MIN_VISUAL_WIDTH);
            
            return Math.max(MIN_VISUAL_WIDTH, Math.min(MAX_VISUAL_WIDTH, width));
          }}
          linkDirectionalParticles={1}
          linkDirectionalParticleWidth={3}
          linkDirectionalParticleSpeed={0.006}
          linkCurvature={0.1}
          cooldownTicks={150}
          onEngineStop={() => {
            if (fgRef.current) {
              fgRef.current.zoomToFit(400, 100);
            }
          }}
          backgroundColor="hsl(var(--card))"
          enableZoomInteraction={true}
          enablePanInteraction={true}
          onNodeHover={handleNodeHover}
          onNodeClick={handleNodeClick}
          linkCanvasObjectMode={() => 'after'}
          linkCanvasObject={(linkInput, ctx, globalScale) => {
            const link = linkInput as AppGraphLink & LinkObject; 
            const sourceNode = link.source as FGNodeObject | undefined;
            const targetNode = link.target as FGNodeObject | undefined;

            if (!sourceNode || !targetNode || typeof sourceNode.x !== 'number' || typeof sourceNode.y !== 'number' || typeof targetNode.x !== 'number' || typeof targetNode.y !== 'number') {
              return; 
            }

            const label = `${(link.value * 100).toFixed(2)}%`;
            const fontSize = 6 / globalScale; 
            
            ctx.font = `${Math.max(2.5, fontSize)}px Sans-Serif`;
            ctx.fillStyle = resolvedLinkTextColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const midX = sourceNode.x + (targetNode.x - sourceNode.x) / 2;
            const midY = sourceNode.y + (targetNode.y - sourceNode.y) / 2;
            
            const linkAngle = Math.atan2(targetNode.y - sourceNode.y, targetNode.x - sourceNode.x);
            const offsetMagnitude = 5 / globalScale; 

            const textPosX = midX + offsetMagnitude * Math.sin(linkAngle);
            const textPosY = midY - offsetMagnitude * Math.cos(linkAngle);

            ctx.fillText(label, textPosX, textPosY);
          }}
        />
      )}
      <div className="absolute bottom-2 right-2 text-xs text-muted-foreground p-1 bg-background/50 rounded">
        Node size/color by proximity. Link width/label by share. Scroll to zoom, drag to pan.
      </div>
    </div>
  );
};

export default NodeGraphVisualization;

