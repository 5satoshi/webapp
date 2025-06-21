
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import NodeGraphVisualization from './NodeGraphVisualization';
import type { NodeGraphData } from '@/lib/types';
import { fetchNodeGraphData } from '@/services/subsumptionService';
import { Share2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface GraphInspectionCardProps {
  centralNodeId: string;
  displayName: string;
}

const neighborCountOptions = Array.from({ length: 10 }, (_, i) => i + 1); // 1 to 10
const degreeOptions = [1, 2, 3, 4, 5]; // Degrees to support

export function GraphInspectionCard({ centralNodeId, displayName }: GraphInspectionCardProps) {
  const [is3D, setIs3D] = useState(false);
  const [numNeighbors, setNumNeighbors] = useState<number>(3);
  const [degree, setDegree] = useState<number>(2);
  const [graphData, setGraphData] = useState<NodeGraphData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadGraphData = useCallback(async (nodeId: string, neighbors: number, degree: number) => {
    if (!nodeId) {
        setGraphData(null);
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      console.log(`GraphInspectionCard: Fetching graph data for ${nodeId} with ${neighbors} neighbors and degree ${degree}.`);
      const data = await fetchNodeGraphData(nodeId, neighbors, degree);
      setGraphData(data);
      if (!data) {
        console.warn(`GraphInspectionCard: No graph data returned for ${nodeId}.`);
      } else {
        console.log(`GraphInspectionCard: Received graph data. Nodes: ${data.nodes?.length}, Links: ${data.links?.length}`);
      }
    } catch (e: any) {
      console.error("GraphInspectionCard: Error fetching graph data:", e);
      setError(e.message || "Failed to load graph data.");
      setGraphData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGraphData(centralNodeId, numNeighbors, degree);
  }, [centralNodeId, numNeighbors, degree, loadGraphData]);

  const handleNumNeighborsChange = (value: string) => {
    const newNum = parseInt(value, 10);
    if (!isNaN(newNum) && newNum >= 1 && newNum <= 10) {
      setNumNeighbors(newNum);
    }
  };

  const handleDegreeChange = (value: string) => {
    const newDegree = parseInt(value, 10);
    if (!isNaN(newDegree) && degreeOptions.includes(newDegree)) {
      setDegree(newDegree);
    }
  };
  
  let graphContent;
  if (isLoading) {
    graphContent = <Skeleton className="h-[400px] w-full" />;
  } else if (error) {
     graphContent = (
      <Alert variant="destructive" className="h-[400px] flex flex-col items-center justify-center">
        <Info className="h-6 w-6 mb-2" />
        <AlertTitle>Error Loading Graph</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  } else if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
    graphContent = (
       <Alert className="h-[400px] flex flex-col items-center justify-center">
        <Info className="h-6 w-6 mb-2" />
        <AlertTitle>No Graph Data</AlertTitle>
        <AlertDescription>
          No graph data could be generated for the selected node with the current settings. Try adjusting the number of neighbors or degree.
        </AlertDescription>
      </Alert>
    );
  } else {
    graphContent = (
      <NodeGraphVisualization
        rawGraphData={graphData}
        centralNodeId={centralNodeId}
        is3D={is3D}
      />
    );
  }


  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-grow">
            <CardTitle className="font-headline flex items-center">
              <Share2 className="mr-2 h-6 w-6 text-primary" />
              Graph Inspection: {displayName}
            </CardTitle>
            <CardDescription>
              Visualizing connections for the selected node. Select number of neighbors, degree, and view mode.
            </CardDescription>
          </div>
          <div className="flex flex-col xs:flex-row items-start xs:items-center gap-4 pt-2 sm:pt-0">
             <div className="flex items-center space-x-2">
                <Label htmlFor="degree-select" className="text-sm whitespace-nowrap">Degree:</Label>
                <Select value={String(degree)} onValueChange={handleDegreeChange}>
                    <SelectTrigger id="degree-select" className="w-[70px] h-9">
                        <SelectValue placeholder="Degree" />
                    </SelectTrigger>
                    <SelectContent>
                        {degreeOptions.map(deg => (
                            <SelectItem key={deg} value={String(deg)}>{deg}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex items-center space-x-2">
                <Label htmlFor="num-neighbors-select" className="text-sm whitespace-nowrap">Neighbors:</Label>
                <Select value={String(numNeighbors)} onValueChange={handleNumNeighborsChange}>
                    <SelectTrigger id="num-neighbors-select" className="w-[70px] h-9">
                        <SelectValue placeholder="Neighbors" />
                    </SelectTrigger>
                    <SelectContent>
                        {neighborCountOptions.map(num => (
                            <SelectItem key={num} value={String(num)}>{num}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="view-mode-switch" className="text-sm whitespace-nowrap">3D View</Label>
              <Switch
                id="view-mode-switch"
                checked={is3D}
                onCheckedChange={setIs3D}
                aria-label="Toggle 3D view"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {graphContent}
      </CardContent>
    </Card>
  );
}
