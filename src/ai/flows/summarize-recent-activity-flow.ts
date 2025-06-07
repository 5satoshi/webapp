
'use server';
/**
 * @fileOverview AI-powered summary of recent node activity.
 *
 * - summarizeRecentActivity - A function that generates a natural language summary of node activity.
 * - SummarizeRecentActivityInput - The input type for the summarizeRecentActivity function.
 * - SummarizeRecentActivityOutput - The return type for the summarizeRecentActivity function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeRecentActivityInputSchema = z.object({
  aggregationPeriodLabel: z.string().describe('The label for the aggregation period (e.g., "day", "week", "month", "quarter").'),
  maxPaymentForwardedSats: z.number().describe('The largest payment forwarded in satoshis during the period.'),
  totalFeesEarnedSats: z.number().describe('The total forwarding fees earned in satoshis during the period.'),
  paymentsForwardedCount: z.number().describe('The total number of payments forwarded during the period.'),
  channelsOpenedCount: z.number().describe('The number of channels opened during the period.'),
  channelsClosedCount: z.number().describe('The number of channels closed during the period.'),
});
export type SummarizeRecentActivityInput = z.infer<typeof SummarizeRecentActivityInputSchema>;

const SummarizeRecentActivityOutputSchema = z.object({
  summaryText: z.string().describe('A concise, natural language summary of the recent node activity. This summary should not use any markdown formatting.'),
});
export type SummarizeRecentActivityOutput = z.infer<typeof SummarizeRecentActivityOutputSchema>;

export async function summarizeRecentActivity(input: SummarizeRecentActivityInput): Promise<SummarizeRecentActivityOutput> {
  return summarizeRecentActivityFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeRecentActivityPrompt',
  input: {schema: SummarizeRecentActivityInputSchema},
  output: {schema: SummarizeRecentActivityOutputSchema},
  prompt: `You are an expert assistant for Lightning Network node operators.
  Analyze the following recent activity data for the last {{{aggregationPeriodLabel}}} and generate a short, engaging, natural language summary.
  Highlight the most interesting or significant pieces of information.
  Do NOT use any markdown formatting (like bolding, italics, or lists) in your response. Ensure the output is plain text.

  Recent Activity Data (last {{{aggregationPeriodLabel}}}):
  - Largest payment forwarded: {{{maxPaymentForwardedSats}}} sats
  - Total fees earned: {{{totalFeesEarnedSats}}} sats
  - Payments forwarded: {{{paymentsForwardedCount}}}
  - Channels opened: {{{channelsOpenedCount}}}
  - Channels closed: {{{channelsClosedCount}}}

  Focus on making the summary easy to read and informative. For example, if fees are high, mention it. If many channels were opened, that's interesting. If no payments were forwarded, state that clearly.
  Be concise, aim for 2-3 sentences.
  If all activity metrics are zero, provide a calm statement like "The node was quiet during the last {{{aggregationPeriodLabel}}} with no new transactions or channel changes."
  `,
});

const summarizeRecentActivityFlow = ai.defineFlow(
  {
    name: 'summarizeRecentActivityFlow',
    inputSchema: SummarizeRecentActivityInputSchema,
    outputSchema: SummarizeRecentActivityOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output || !output.summaryText) {
      console.error('AI prompt for summarizeRecentActivityFlow returned null, undefined, or empty summaryText.');
      console.error('Input to prompt:', JSON.stringify(input, null, 2));
      console.error('Raw output from prompt (if any):', JSON.stringify(output, null, 2));
      // Fallback in case the LLM returns nothing or an unexpected structure
      return { summaryText: "Could not generate an activity summary at this time. Please check back later." };
    }
    return output;
  }
);

