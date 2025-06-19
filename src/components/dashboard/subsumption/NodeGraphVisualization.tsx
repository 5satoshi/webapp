
'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { NodeGraphData, GraphNode } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

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
  const fgRef = useRef<any>(); // To store ForceGraph instance for API calls
  const [dimensions, setDimensions] = useState({ width: 0, height: 400 }); 
  const [hasMounted, setHasMounted] = useState(false);

  // Colors are now expected to be set on the node object by the API
  const linkColor = 'hsla(var(--muted-foreground), 0.3)';

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
    return node.color || 'hsl(var(--accent))'; // Fallback to accent if color not set from API
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


  if (!hasMounted) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
     return (
        <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Graph Data Not Available</AlertTitle>
            <AlertDescription>
            Could not retrieve graph data for {centralNodeId ? `${centralNodeId.substring(0,10)}...` : 'the selected node'}, or it has no connections meeting the criteria (common type, shortest path share &ge; 0.1%).
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
          nodeColor={getNodeColor} // Uses the color from the node object
          nodeRelSize={4} 
          linkColor={() => linkColor}
          linkWidth={link => Math.max(0.5, (link as any).value * 30)} 
          linkDirectionalParticles={1}
          linkDirectionalParticleWidth={1.5}
          linkDirectionalParticleSpeed={0.006}
          linkCurvature={0.1}
          cooldownTicks={150} 
          onEngineStop={() => {
             if (fgRef.current) {
                fgRef.current.zoomToFit(400, 150); // Zoom to fit, 150px padding
             }
          }}
          backgroundColor="hsl(var(--card))"
          enableZoomInteraction={true}
          enablePanInteraction={true}
          onNodeHover={handleNodeHover}
          onNodeClick={handleNodeClick}
        />
      )}
       <div className="absolute bottom-2 right-2 text-xs text-muted-foreground p-1 bg-background/50 rounded">
        Scroll to zoom, drag to pan. Node size/color indicates proximity to central. Link thickness reflects path share.
      </div>
    </div>
  );
};

export default NodeGraphVisualization;
