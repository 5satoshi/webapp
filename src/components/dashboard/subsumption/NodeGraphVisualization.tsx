
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

const MIN_VISIBLE_LINK_WIDTH = 0.5; // Minimum pixel width for any link
const MAX_VISUAL_LINK_WIDTH = 50.0; // Pixel width for the link with the maxVisibleShare

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
      if (fgColorParts.length === 3 && !isNaN(parseFloat(fgColorParts[0])) && fgColorParts[1].endsWith('%') && fgColorParts[2].endsWith('%')) {
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
    maxVisibleShare, // We need maxVisibleShare for the new scaling
  } = useMemo(() => {
    if (!rawGraphData || !rawGraphData.nodes) {
      return { nodes: [], links: [], maxVisibleShare: 0 };
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
    
    if (currentNodes.length === 0 && rawGraphData.nodes.length > 0) {
        const central = rawGraphData.nodes.find(n => n.id === centralNodeId);
        if (central) {
            currentNodes = [central]; // Show at least the central node if no links meet criteria
        }
    }
    
    let maxS = 0;
    if (currentLinks.length > 0) {
      currentLinks.forEach(link => {
        maxS = Math.max(maxS, link.value);
      });
    }

    return {
      nodes: currentNodes,
      links: currentLinks,
      maxVisibleShare: maxS,
    };
  }, [rawGraphData, linkDisplayMode, shareThreshold, centralNodeId]);

  const getNodeColor = useCallback((node: GraphNode) => {
    return node.color || 'hsl(288, 48%, 60%)'; // Fallback: Accent (Electric Purple)
  }, []);

  const handleNodeHover = useCallback((node: GraphNode | FGNodeObject | null) => {
    if (graphRef.current) {
      graphRef.current.style.cursor = node ? 'pointer' : '';
    }
  }, []);

  const handleNodeClick = useCallback((node: GraphNode | FGNodeObject) => {
    if (fgRef.current) {
      const fgNode = node as FGNodeObject;
      if (typeof fgNode.x === 'number' && typeof fgNode.y === 'number') {
        fgRef.current.centerAt(fgNode.x, fgNode.y, 1000);
        fgRef.current.zoom(2.5, 1000);
      }
    }
    const appNode = node as GraphNode;
    console.log("Clicked node:", appNode.name, "ID:", appNode.id);
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
          Could not retrieve initial graph data.
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
          No nodes or links match the current criteria ({modeText}). Try adjusting the filter.
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
            if (finalLinks.length === 0 || maxVisibleShare === 0) {
              return MIN_VISIBLE_LINK_WIDTH; // Default for no links or all zero shares
            }
            const width = (link.value / maxVisibleShare) * MAX_VISUAL_LINK_WIDTH;
            return Math.max(MIN_VISIBLE_LINK_WIDTH, Math.min(MAX_VISUAL_LINK_WIDTH, width));
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
            const fontSizeBase = 6; // Base font size
            const fontSize = Math.max(2.5, fontSizeBase / globalScale); // Scale font size, ensure minimum
            
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.fillStyle = resolvedLinkTextColor;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const midX = sourceNode.x + (targetNode.x - sourceNode.x) / 2;
            const midY = sourceNode.y + (targetNode.y - sourceNode.y) / 2;
            
            // Calculate offset perpendicular to the link
            const linkAngle = Math.atan2(targetNode.y - sourceNode.y, targetNode.x - sourceNode.x);
            const offsetMagnitude = (5 + (link.value / maxVisibleShare) * MAX_VISUAL_LINK_WIDTH / 2) / globalScale; // Offset further for wider links

            const textPosX = midX + offsetMagnitude * Math.sin(linkAngle);
            const textPosY = midY - offsetMagnitude * Math.cos(linkAngle);

            ctx.fillText(label, textPosX, textPosY);
          }}
        />
      )}
      <div className="absolute bottom-2 right-2 text-xs text-muted-foreground p-1 bg-background/50 rounded">
        Node size/color by proximity. Link width/label by share (%). Scroll to zoom, drag to pan.
      </div>
    </div>
  );
};

export default NodeGraphVisualization;

