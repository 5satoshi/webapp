
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

interface HoveredLinkInfo {
  sourceId: string;
  sourceName: string;
  targetId: string;
  targetName: string;
  share: number;
  x: number; // x position of the hover event
  y: number; // y position of the hover event
}

const NodeGraphVisualization: React.FC<NodeGraphVisualizationProps> = ({ graphData, centralNodeId }) => {
  const graphRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>();
  const [dimensions, setDimensions] = useState({ width: 0, height: 400 });
  const [hasMounted, setHasMounted] = useState(false);
  const [hoveredLinkInfo, setHoveredLinkInfo] = useState<HoveredLinkInfo | null>(null);

  const linkColor = 'hsla(240, 3.8%, 46.1%, 0.3)'; // Based on muted-foreground with some transparency

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (graphRef.current && hasMounted) {
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
  }, [hasMounted, graphData]);

  const getNodeColor = useCallback((node: GraphNode) => {
    return node.color || 'hsl(288, 48%, 60%)'; // Fallback to accent color (Electric Purple HSL string)
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

  const handleLinkHover = useCallback((link: GraphLink | null, prevLink: GraphLink | null, event?: MouseEvent) => {
    if (graphRef.current) {
        graphRef.current.style.cursor = link ? 'default' : '';
    }
    if (link && graphData?.nodes && event) {
      const sourceNode = graphData.nodes.find(n => n.id === link.source);
      const targetNode = graphData.nodes.find(n => n.id === link.target);
      if (sourceNode && targetNode && graphRef.current) {
        const rect = graphRef.current.getBoundingClientRect();
        setHoveredLinkInfo({
          sourceId: String(link.source),
          sourceName: sourceNode.name,
          targetId: String(link.target),
          targetName: targetNode.name,
          share: link.value,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
      }
    } else {
      setHoveredLinkInfo(null);
    }
  }, [graphData]);


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
          linkWidth={link => Math.max(0.2, (link as any).value * 5000)}
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
      {hoveredLinkInfo && (
        <div
          className="absolute p-2 bg-popover text-popover-foreground text-xs rounded-md shadow-lg pointer-events-none"
          style={{
            left: `${hoveredLinkInfo.x + 10}px`, 
            top: `${hoveredLinkInfo.y + 10}px`,
            transform: 'translate(-50%, -100%)', 
            maxWidth: '250px',
            wordBreak: 'break-word',
          }}
        >
          <div className="font-semibold">Link Details</div>
          <div><span className="font-medium">From:</span> {hoveredLinkInfo.sourceName}</div>
          <div><span className="font-medium">To:</span> {hoveredLinkInfo.targetName}</div>
          <div><span className="font-medium">Share:</span> {(hoveredLinkInfo.share * 100).toFixed(4)}%</div>
        </div>
      )}
      <div className="absolute bottom-2 right-2 text-xs text-muted-foreground p-1 bg-background/50 rounded">
        Scroll to zoom, drag to pan. Node size/color indicates proximity to central. Link thickness reflects path share. Hover over links for details.
      </div>
    </div>
  );
};

export default NodeGraphVisualization;

