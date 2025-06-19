
'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { NodeGraphData, GraphNode, GraphLink } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const fgRef = useRef<any>();
  const [dimensions, setDimensions] = useState({ width: 0, height: 400 });
  const [hasMounted, setHasMounted] = useState(false);
  
  const [hoveredLink, setHoveredLink] = useState<GraphLink | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);

  const linkColor = 'hsla(240, 3.8%, 46.1%, 0.3)';

  useEffect(() => {
    setHasMounted(true);
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

      const handleMouseMove = (event: MouseEvent) => {
        if (graphRef.current) {
            const rect = graphRef.current.getBoundingClientRect();
            setMousePosition({
                x: event.clientX - rect.left,
                y: event.clientY - rect.top,
            });
        }
      };
      currentGraphRef.addEventListener('mousemove', handleMouseMove);

      const handleMouseLeave = () => {
        setMousePosition(null);
        setHoveredLink(null); // Clear hovered link and hide tooltip
      };
      currentGraphRef.addEventListener('mouseleave', handleMouseLeave);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (currentGraphRef) {
            currentGraphRef.removeEventListener('mousemove', handleMouseMove);
            currentGraphRef.removeEventListener('mouseleave', handleMouseLeave);
        }
      };
    }
  }, [hasMounted]); // Effect for listeners depends only on hasMounted

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
      fgRef.current.centerAt(node.x, node.y, 1000);
      fgRef.current.zoom(2.5, 1000);
    }
    console.log("Clicked node:", node.name, "ID:", node.id);
  }, []);

  const handleLinkHover = useCallback((link: GraphLink | null) => {
    setHoveredLink(link); // Set or clear the hovered link object
    if (graphRef.current) {
      graphRef.current.style.cursor = link ? 'default' : '';
    }
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
  
  let tooltipComponent = null;
  if (hoveredLink && mousePosition && graphData?.nodes) {
    const sourceNode = graphData.nodes.find(n => n.id === hoveredLink.source);
    const targetNode = graphData.nodes.find(n => n.id === hoveredLink.target);
    if (sourceNode && targetNode) {
      tooltipComponent = (
        <div
          className="absolute p-2 bg-popover text-popover-foreground text-xs rounded-md shadow-lg pointer-events-none"
          style={{
            left: `${mousePosition.x}px`,
            top: `${mousePosition.y}px`,
            transform: 'translate(10px, -25px)', // Position tooltip slightly offset from cursor
            maxWidth: '250px',
            wordBreak: 'break-word',
            zIndex: 100, // Ensure tooltip is on top
          }}
        >
          <div className="font-semibold">Link Details</div>
          <div><span className="font-medium">From:</span> {sourceNode.name}</div>
          <div><span className="font-medium">To:</span> {targetNode.name}</div>
          <div><span className="font-medium">Share:</span> {(hoveredLink.value * 100).toFixed(4)}%</div>
        </div>
      );
    }
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
          linkWidth={link => Math.max(0.2, (link as GraphLink).value * 5000)}
          linkDirectionalParticles={1}
          linkDirectionalParticleWidth={1.5}
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
          onLinkHover={handleLinkHover}
        />
      )}
      {tooltipComponent}
      <div className="absolute bottom-2 right-2 text-xs text-muted-foreground p-1 bg-background/50 rounded">
        Scroll to zoom, drag to pan. Node size/color indicates proximity. Link thickness reflects share. Hover links for details.
      </div>
    </div>
  );
};

export default NodeGraphVisualization;

