
'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { NodeGraphData, GraphNode, GraphLink as AppGraphLink } from '@/lib/types'; // Renamed to avoid conflict
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { ForceGraphMethods, LinkObject, NodeObject as FGNodeObject } from 'react-force-graph-2d';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px] w-full" />,
});

interface NodeGraphVisualizationProps {
  graphData: NodeGraphData | null;
  centralNodeId: string;
}

const NodeGraphVisualization: React.FC<NodeGraphVisualizationProps> = ({ graphData, centralNodeId }) => {
  const graphRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraphMethods>();
  const [dimensions, setDimensions] = useState({ width: 0, height: 400 });
  const [hasMounted, setHasMounted] = useState(false);
  const [resolvedLinkTextColor, setResolvedLinkTextColor] = useState('rgba(50, 50, 50, 0.9)'); // Default dark gray

  const linkColor = 'hsla(240, 3.8%, 46.1%, 0.3)';

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const style = getComputedStyle(document.documentElement);
      // Assuming --foreground is defined like "240 10% 3.9%" in globals.css
      const fgColorParts = style.getPropertyValue('--foreground').trim().split(" ");
      if (fgColorParts.length === 3) {
         setResolvedLinkTextColor(`hsl(${fgColorParts[0]}, ${fgColorParts[1]}, ${fgColorParts[2]})`);
      } else {
        // Fallback if CSS variable parsing fails
        const bodyColor = getComputedStyle(document.body).color;
        setResolvedLinkTextColor(bodyColor || 'rgba(50, 50, 50, 0.9)');
      }
    }
  }, []);

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
      handleResize(); // Initial size
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [hasMounted]);

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
      // FGNodeObject type is used by react-force-graph, it might have x,y. Our GraphNode might not.
      // Need to ensure the 'node' object passed here has x and y for centerAt.
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

  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Graph Data Not Available</AlertTitle>
        <AlertDescription>
          Could not retrieve graph data for {centralNodeId ? `${centralNodeId.substring(0, 10)}...` : 'the selected node'}, or it has no connections meeting the criteria (common type, shortest path share &ge; 0.1%).
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div ref={graphRef} className="w-full h-[400px] rounded-lg border bg-card relative overflow-hidden">
      {dimensions.width > 0 && (
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
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
          linkCanvasObjectMode={() => 'after'} // Draw after default link elements
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
            const offsetMagnitude = 5 / globalScale; // How far from the line the text should be

            // Calculate offset perpendicular to the link
            const textPosX = midX + offsetMagnitude * Math.sin(linkAngle);
            const textPosY = midY - offsetMagnitude * Math.cos(linkAngle);

            ctx.fillText(label, textPosX, textPosY);
          }}
        />
      )}
      <div className="absolute bottom-2 right-2 text-xs text-muted-foreground p-1 bg-background/50 rounded">
        Scroll to zoom, drag to pan. Node size/color indicates proximity. Link thickness/label reflects share.
      </div>
    </div>
  );
};

export default NodeGraphVisualization;
