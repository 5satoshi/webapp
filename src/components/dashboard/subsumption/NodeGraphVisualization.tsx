
'use client';

import React, { useRef, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { NodeGraphData, GraphNode } from '@/lib/types';
import { useTheme } from 'next-themes'; // Assuming you might add theme switching later
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

// Dynamically import ForceGraph2D to ensure it only runs on the client-side
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
  const [dimensions, setDimensions] = useState({ width: 0, height: 400 }); // Default height
  const [hasMounted, setHasMounted] = useState(false);

  // For theme-aware colors - using fixed colors for now but setup for future
  // const { resolvedTheme } = useTheme(); 
  const resolvedTheme = 'light'; // Hardcode to light for now as per current app setup

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (graphRef.current && hasMounted) {
      const handleResize = () => {
        if (graphRef.current) {
          setDimensions({
            width: graphRef.current.offsetWidth,
            height: 400, // Keep fixed height or make it responsive too
          });
        }
      };
      handleResize(); // Initial size
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [hasMounted, graphData]); // Rerun on graphData change might be useful if container might change

  if (!hasMounted) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
     return (
        <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Graph Data Not Available</AlertTitle>
            <AlertDescription>
            Could not retrieve graph data for {centralNodeId ? `${centralNodeId.substring(0,10)}...` : 'the selected node'}, or it has no connections meeting the criteria (shortest path share >= 0.001).
            </AlertDescription>
        </Alert>
    );
  }
  
  const getNodeColor = (node: GraphNode) => {
    if (node.isCentralNode) {
      return resolvedTheme === 'dark' ? 'hsl(var(--primary-foreground))' : 'hsl(var(--primary))'; // Purple
    }
    return resolvedTheme === 'dark' ? 'hsl(var(--secondary-foreground))' : 'hsl(var(--secondary))'; // Orange
  };

  const getLinkColor = () => {
     return resolvedTheme === 'dark' ? 'hsla(var(--muted-foreground), 0.5)' : 'hsla(var(--muted-foreground), 0.3)';
  };


  return (
    <div ref={graphRef} className="w-full h-[400px] rounded-lg border bg-card relative overflow-hidden">
      {dimensions.width > 0 && (
        <ForceGraph2D
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          nodeId="id"
          nodeVal="val"
          nodeLabel="name"
          nodeColor={getNodeColor}
          nodeRelSize={4} // Default node size
          linkColor={() => getLinkColor()}
          linkWidth={link => Math.max(0.5, link.value * 20)} // Adjust multiplier for visibility
          linkDirectionalParticles={1}
          linkDirectionalParticleWidth={1.5}
          linkDirectionalParticleSpeed={0.006}
          linkCurvature={0.1}
          dagMode={null} // Experiment with 'td', 'lr', etc., or null for organic
          dagLevelDistance={50}
          cooldownTicks={100}
          onEngineStop={() => {
            // Access internal force-graph controls if needed, e.g., for zoom
            // This is where you might set initial zoom if the graph is too spread out/small
            // For example: fgRef.current.zoomToFit(400, 100); // 400ms duration, 100px padding
          }}
          // You can expose the force graph instance via a ref if more control is needed
          // ref={fgRef} 
          backgroundColor="hsl(var(--card))"
          enableZoomInteraction={true}
          enablePanInteraction={true}
          enablePointerInteraction={true}
        />
      )}
       <div className="absolute bottom-2 right-2 text-xs text-muted-foreground p-1 bg-background/50 rounded">
        Scroll to zoom, drag to pan. Node size indicates centrality (selected node larger). Link thickness reflects path share.
      </div>
    </div>
  );
};

export default NodeGraphVisualization;
