'use client';

import type { AiStructuredInput, Recommendation } from '@/lib/types';
import { generateNodeRecommendations, type GenerateNodeRecommendationsInput } from '@/ai/flows/generate-node-recommendations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useState, useTransition } from 'react';
import { AlertTriangle, CheckCircle, Cpu, Loader2, Wand2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from '@/components/ui/badge';

interface InsightsGeneratorProps {
  initialAiInput: AiStructuredInput;
}

export function InsightsGenerator({ initialAiInput }: InsightsGeneratorProps) {
  const [isPending, startTransition] = useTransition();
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiInputData, setAiInputData] = useState<AiStructuredInput>(initialAiInput);

  const handleInputChange = (field: keyof AiStructuredInput, value: string | number) => {
    setAiInputData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSubmit = () => {
    setError(null);
    setRecommendations(null);
    startTransition(async () => {
      try {
        const result = await generateNodeRecommendations(aiInputData as GenerateNodeRecommendationsInput);
        if (result && result.recommendations) {
          setRecommendations(result.recommendations);
        } else {
          setError("Received an unexpected response from the AI.");
        }
      } catch (e) {
        console.error(e);
        setError(e instanceof Error ? e.message : "An unknown error occurred while generating insights.");
      }
    });
  };

  const getPriorityBadgeVariant = (priority: Recommendation['priority']) => {
    switch (priority) {
      case 'High': return 'destructive';
      case 'Medium': return 'default'; // yellow-ish if possible, but default is fine.
      case 'Low': return 'secondary';
      default: return 'outline';
    }
  };


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline flex items-center gap-2"><Cpu size={24}/> Node Data Input</CardTitle>
          <CardDescription>
            Review and adjust your node's current statistics. The AI will use this data to generate recommendations.
            (For demo purposes, some fields are stringified JSON or descriptive text).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(aiInputData).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <Label htmlFor={key} className="capitalize font-medium">{key.replace(/([A-Z])/g, ' $1')}</Label>
                {typeof value === 'number' ? (
                  <Textarea
                    id={key}
                    value={String(value)}
                    onChange={(e) => handleInputChange(key as keyof AiStructuredInput, parseFloat(e.target.value) || 0)}
                    className="font-mono text-sm"
                    rows={1}
                  />
                ) : (
                  <Textarea
                    id={key}
                    value={value}
                    onChange={(e) => handleInputChange(key as keyof AiStructuredInput, e.target.value)}
                    className="font-mono text-sm"
                    rows={3}
                  />
                )}
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSubmit} disabled={isPending} className="w-full sm:w-auto bg-cta-orange hover:bg-cta-orange/90 text-primary-foreground">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            Generate Insights
          </Button>
        </CardFooter>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error Generating Insights</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {recommendations && recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2"><CheckCircle size={24} className="text-green-500" /> Optimization Recommendations</CardTitle>
            <CardDescription>
              Based on the provided data, here are some tailored suggestions to improve your node.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recommendations.map((rec, index) => (
              <Card key={index} className="bg-background/50">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-semibold font-headline">{rec.title}</CardTitle>
                    <Badge variant={getPriorityBadgeVariant(rec.priority)}>{rec.priority}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{rec.description}</p>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}
       {recommendations && recommendations.length === 0 && !isPending && (
         <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>No Recommendations Generated</AlertTitle>
            <AlertDescription>The AI could not generate specific recommendations with the current data. Try adjusting the input values.</AlertDescription>
        </Alert>
       )}
    </div>
  );
}
