
'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { NodeGraphData, GraphNode, GraphLink as AppGraphLink } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import type { ForceGraphMethods as FG2DMethods, LinkObject as LinkObject2D, NodeObject as FGNodeObject } from 'react-force-graph-2d';
import type { ForceGraphMethods as FG3DMethods, LinkObject as LinkObject3D } from 'react-force-graph-3d';


const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px] w-full" />,
});

const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px] w-full" />,
});

interface NodeGraphVisualizationProps {
  rawGraphData: NodeGraphData | null;
  centralNodeId: string;
  is3D: boolean;
  showZeroShare: boolean;
}

const MIN_LINK_WIDTH = 0.5;
const MAX_VISUAL_LINK_WIDTH = 25.0; // The absolute max width in pixels.

const NodeGraphVisualization: React.FC<NodeGraphVisualizationProps> = ({
  rawGraphData,
  centralNodeId,
  is3D,
  showZeroShare,
}) => {
  const graphRef = useRef<HTMLDivElement>(null);
  const fgRef2D = useRef<FG2DMethods>();
  const fgRef3D = useRef<FG3DMethods>();
  const [dimensions, setDimensions] = useState({ width: 0, height: 400 });
  const [hasMounted, setHasMounted] = useState(false);
  const [resolvedLinkTextColor, setResolvedLinkTextColor] = useState('rgba(50, 50, 50, 0.9)');
  const [resolvedCardColor, setResolvedCardColor] = useState('hsl(0, 0%, 100%)'); // Default to white
  
  const linkColor = 'hsla(240, 3.8%, 46.1%, 0.3)';

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && hasMounted) {
      const style = getComputedStyle(document.documentElement);

      // Resolve foreground for text
      const fgColorParts = style.getPropertyValue('--foreground').trim().split(" ");
      if (fgColorParts.length === 3 && !isNaN(parseFloat(fgColorParts[0])) && fgColorParts[1].endsWith('%') && fgColorParts[2].endsWith('%')) {
         setResolvedLinkTextColor(`hsl(${fgColorParts[0]}, ${fgColorParts[1]}, ${fgColorParts[2]})`);
      } else {
        const bodyColor = getComputedStyle(document.body).color;
        setResolvedLinkTextColor(bodyColor || 'rgba(50, 50, 50, 0.9)');
      }

      // Resolve card for background
      const cardColorParts = style.getPropertyValue('--card').trim().split(" ");
       if (cardColorParts.length === 3 && !isNaN(parseFloat(cardColorParts[0])) && cardColorParts[1].endsWith('%') && cardColorParts[2].endsWith('%')) {
         setResolvedCardColor(`hsl(${cardColorParts[0]}, ${cardColorParts[1]}, ${cardColorParts[2]})`);
      } else {
        // Fallback if --card is not defined as HSL parts
        setResolvedCardColor('hsl(0, 0%, 100%)');
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
    maxVisibleShare,
  } = useMemo(() => {
    if (!rawGraphData || !rawGraphData.nodes) {
      return { nodes: [], links: [], maxVisibleShare: 0 };
    }
    
    // Always render all nodes returned by the API
    const currentNodes = rawGraphData.nodes;
    let visibleLinks = rawGraphData.links || [];
    
    if (!showZeroShare) {
        visibleLinks = visibleLinks.filter(link => link.value > 0);
    }
    
    let maxS = 0;
    if (visibleLinks.length > 0) {
      visibleLinks.forEach(link => {
        maxS = Math.max(maxS, link.value);
      });
    }

    return {
      nodes: currentNodes,
      links: visibleLinks,
      maxVisibleShare: maxS,
    };
  }, [rawGraphData, showZeroShare]);


  const getNodeColor = useCallback((node: GraphNode) => {
    return node.color || 'hsl(288, 48%, 60%)'; // Fallback to accent color
  }, []);

  const handleNodeHover = useCallback((node: object | null) => {
    if (graphRef.current) {
      graphRef.current.style.cursor = node ? 'pointer' : '';
    }
  }, []);

  const handleNodeClick2D = useCallback((node: FGNodeObject) => {
    if (fgRef2D.current) {
      if (typeof node.x === 'number' && typeof node.y === 'number') {
        fgRef2D.current.centerAt(node.x, node.y, 1000);
        fgRef2D.current.zoom(2.5, 1000);
      }
    }
    const appNode = node as GraphNode;
    console.log("Clicked node:", appNode.name, "ID:", appNode.id);
  }, []);

  const handleNodeClick3D = useCallback((node: FGNodeObject) => {
    if (fgRef3D.current) {
      const distance = 40;
      const distRatio = 1 + distance / Math.hypot(node.x ?? 0, node.y ?? 0, node.z ?? 0);
      fgRef3D.current.cameraPosition(
        { x: (node.x ?? 0) * distRatio, y: (node.y ?? 0) * distRatio, z: (node.z ?? 0) * distRatio }, // new position
        node, // lookAt target
        3000  // ms transition duration
      );
    }
    const appNode = node as GraphNode;
    console.log("Clicked node:", appNode.name, "ID:", appNode.id);
  }, []);

  const getLinkWidth = useCallback((link: AppGraphLink) => {
    if (maxVisibleShare === 0) {
        return MIN_LINK_WIDTH;
    }
    const width = (link.value / maxVisibleShare) * MAX_VISUAL_LINK_WIDTH;
    return Math.max(MIN_LINK_WIDTH, width);
  }, [maxVisibleShare]);
  
  const getLinkParticles = useCallback((link: AppGraphLink) => {
    const MAX_PARTICLES = 10;
    if (maxVisibleShare === 0) {
        return 1;
    }
    const normalized = link.value / maxVisibleShare;
    // Scale particles from 1 to MAX_PARTICLES
    return Math.max(1, Math.ceil(normalized * MAX_PARTICLES));
  }, [maxVisibleShare]);


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
     const modeText = "for all selected nodes";
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>No Graph Elements to Display</AlertTitle>
        <AlertDescription>
          No nodes were selected by the API, or no links match the current criteria ({modeText}).
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div ref={graphRef} className="w-full h-[400px] rounded-lg border bg-card relative overflow-hidden">
      {dimensions.width > 0 && (
        <>
        {is3D ? (
           <ForceGraph3D
            ref={fgRef3D}
            graphData={{ nodes: finalNodes, links: finalLinks }}
            width={dimensions.width}
            height={dimensions.height}
            nodeId="id"
            nodeVal="val"
            nodeLabel="name"
            nodeColor={getNodeColor}
            linkColor={() => linkColor}
            linkWidth={getLinkWidth}
            linkDirectionalParticles={getLinkParticles}
            linkDirectionalParticleWidth={3}
            backgroundColor={resolvedCardColor}
            onNodeHover={handleNodeHover}
            onNodeClick={handleNodeClick3D}
          />
        ) : (
          <ForceGraph2D
            ref={fgRef2D}
            graphData={{ nodes: finalNodes, links: finalLinks }}
            width={dimensions.width}
            height={dimensions.height}
            nodeId="id"
            nodeVal="val"
            nodeLabel="name"
            nodeColor={getNodeColor}
            nodeRelSize={4}
            linkColor={() => linkColor}
            linkWidth={getLinkWidth}
            linkDirectionalParticles={getLinkParticles}
            linkDirectionalParticleSpeed={0.006}
            linkCurvature={0.1}
            cooldownTicks={150}
            onEngineStop={() => {
              if (fgRef2D.current && finalNodes.length > 0) {
                fgRef2D.current.zoomToFit(400, 100);
              }
            }}
            backgroundColor={resolvedCardColor}
            enableZoomInteraction={true}
            enablePanInteraction={true}
            onNodeHover={handleNodeHover}
            onNodeClick={handleNodeClick2D}
            linkCanvasObjectMode={() => 'after'}
            linkCanvasObject={(linkInput, ctx, globalScale) => {
              const link = linkInput as AppGraphLink & LinkObject2D; 
              const sourceNode = link.source as FGNodeObject | undefined;
              const targetNode = link.target as FGNodeObject | undefined;

              if (!sourceNode || !targetNode || typeof sourceNode.x !== 'number' || typeof sourceNode.y !== 'number' || typeof targetNode.x !== 'number' || typeof targetNode.y !== 'number') {
                return; 
              }

              const label = `${(link.value * 100).toFixed(2)}%`;
              const fontSizeBase = 6; 
              const fontSize = Math.max(2.5, fontSizeBase / globalScale); 
              
              ctx.font = `${fontSize}px Sans-Serif`;
              ctx.fillStyle = resolvedLinkTextColor;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';

              const midX = sourceNode.x + (targetNode.x - sourceNode.x) / 2;
              const midY = sourceNode.y + (targetNode.y - sourceNode.y) / 2;
              
              const linkAngle = Math.atan2(targetNode.y - sourceNode.y, targetNode.x - sourceNode.x);
              
              let currentLinkWidth = getLinkWidth(link);
              const offsetMagnitude = (5 + currentLinkWidth / 2) / globalScale;

              const textPosX = midX + offsetMagnitude * Math.sin(linkAngle);
              const textPosY = midY - offsetMagnitude * Math.cos(linkAngle);

              ctx.fillText(label, textPosX, textPosY);
            }}
          />
        )}
        </>
      )}
      <div className="absolute bottom-2 right-2 text-xs text-muted-foreground p-1 bg-background/50 rounded">
        {is3D ? "Right-click to pan, scroll to zoom" : "Share % shown on links. Scroll to zoom, drag to pan."}
      </div>
    </div>
  );
};

export default NodeGraphVisualization;
