
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

  const processedGraphData = useMemo(() => {
    if (!rawGraphData) return null;

    let filteredLinks = rawGraphData.links;
    if (linkDisplayMode === 'threshold') {
      filteredLinks = rawGraphData.links.filter(link => link.value >= shareThreshold);
    }
    
    // Ensure all nodes participating in the filtered links are present, plus the central node.
    const participatingNodeIds = new Set<string>([centralNodeId]);
    filteredLinks.forEach(link => {
      participatingNodeIds.add(link.source);
      participatingNodeIds.add(link.target);
    });

    const filteredNodes = rawGraphData.nodes.filter(node => participatingNodeIds.has(node.id));
    
    // If no nodes remain after filtering (e.g. threshold too high for any links),
    // ensure at least the central node is shown if it exists in raw data.
    if (filteredNodes.length === 0) {
        const central = rawGraphData.nodes.find(n => n.id === centralNodeId);
        if (central) {
            return { nodes: [central], links: [] };
        }
        return { nodes: [], links: [] }; // Should not happen if centralNodeId is always in rawGraphData.nodes
    }

    return {
      nodes: filteredNodes,
      links: filteredLinks,
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
  
  if (!rawGraphData) { // Check rawGraphData before processedGraphData
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

  if (!processedGraphData || !processedGraphData.nodes || processedGraphData.nodes.length === 0) {
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
          graphData={processedGraphData}
          width={dimensions.width}
          height={dimensions.height}
          nodeId="id"
          nodeVal="val"
          nodeLabel="name"
          nodeColor={getNodeColor}
          nodeRelSize={4}
          linkColor={() => linkColor}
          linkWidth={link => Math.max(0.2, (link as AppGraphLink).value * 5000)}
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
        Node size/color by proximity. Link thickness/label by share. Scroll to zoom, drag to pan.
      </div>
    </div>
  );
};

export default NodeGraphVisualization;

    