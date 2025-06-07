'use server';
/**
 * @fileOverview AI-powered insights for optimizing node performance.
 *
 * - generateNodeRecommendations - A function that generates tailored recommendations for node improvements.
 * - GenerateNodeRecommendationsInput - The input type for the generateNodeRecommendations function.
 * - GenerateNodeRecommendationsOutput - The return type for the generateNodeRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateNodeRecommendationsInputSchema = z.object({
  totalPaymentsProcessed: z.number().describe('The total number of payments processed by the node.'),
  forwardingFeesEarned: z.number().describe('The total forwarding fees earned by the node.'),
  nodeUptime: z.number().describe('The uptime of the node as a percentage (0-100).'),
  numberOfChannels: z.number().describe('The number of channels the node has.'),
  historicalRoutingData: z.string().describe('Historical routing data for the node, including timestamps, payment sizes, and success rates.'),
  feeDistributionData: z.string().describe('Fee distribution data, including remote vs. local channel fees (in ppm).'),
  routingActivityData: z.string().describe('Routing activity data, including monthly routing count and daily routing volume.'),
  paymentAmountDistributionData: z.string().describe('Payment amount distribution data, including frequency of different payment sizes and average value trends over time.'),
  networkSubsumptionMetricsData: z.string().describe('Network subsumption metrics data, showing how often the node is the cheapest route for different payment sizes.'),
  timingPatternsHeatmapData: z.string().describe('Timing patterns heatmap data, showing when routing requests occur.'),
});
export type GenerateNodeRecommendationsInput = z.infer<typeof GenerateNodeRecommendationsInputSchema>;

const GenerateNodeRecommendationsOutputSchema = z.object({
  recommendations: z.array(
    z.object({
      title: z.string().describe('The title of the recommendation.'),
      description: z.string().describe('A detailed explanation of the recommendation and how to implement it.'),
      priority: z.enum(['High', 'Medium', 'Low']).describe('The priority of the recommendation.'),
    })
  ).describe('A list of recommendations for optimizing the node.'),
});
export type GenerateNodeRecommendationsOutput = z.infer<typeof GenerateNodeRecommendationsOutputSchema>;

export async function generateNodeRecommendations(input: GenerateNodeRecommendationsInput): Promise<GenerateNodeRecommendationsOutput> {
  return generateNodeRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateNodeRecommendationsPrompt',
  input: {schema: GenerateNodeRecommendationsInputSchema},
  output: {schema: GenerateNodeRecommendationsOutputSchema},
  prompt: `You are an expert Lightning Network node operator providing recommendations to other node operators to improve their node's performance and profitability.

  Analyze the following data and provide actionable recommendations for optimizing the node. Recommendations should be specific and provide clear steps for implementation.  Each recommendation must have a title, a detailed description, and a priority (High, Medium, or Low).

  Node Statistics:
  - Total Payments Processed: {{{totalPaymentsProcessed}}}
  - Forwarding Fees Earned: {{{forwardingFeesEarned}}}
  - Node Uptime: {{{nodeUptime}}}%
  - Number of Channels: {{{numberOfChannels}}}

  Historical Routing Data: {{{historicalRoutingData}}}
  Fee Distribution Data: {{{feeDistributionData}}}
  Routing Activity Data: {{{routingActivityData}}}
  Payment Amount Distribution Data: {{{paymentAmountDistributionData}}}
  Network Subsumption Metrics Data: {{{networkSubsumptionMetricsData}}}
  Timing Patterns Heatmap Data: {{{timingPatternsHeatmapData}}}
  `,
});

const generateNodeRecommendationsFlow = ai.defineFlow(
  {
    name: 'generateNodeRecommendationsFlow',
    inputSchema: GenerateNodeRecommendationsInputSchema,
    outputSchema: GenerateNodeRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
