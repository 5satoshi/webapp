
'use server';
/**
 * @fileOverview Provides autocomplete suggestions for node IDs and aliases, including their latest common rank.
 *
 * - getNodeSuggestions - Fetches suggestions based on a search term by calling an internal API.
 * - GetNodeSuggestionsInput - Input type for the getNodeSuggestions function.
 * - NodeSuggestion - Type for a single suggestion, now includes optional rank.
 * - GetNodeSuggestionsOutput - Output type for the getNodeSuggestions function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
// Direct BigQuery client and utils are removed as we'll call the API.

const API_BASE_URL = '/api/betweenness'; // Define this once, ensure it's correct for your setup

const GetNodeSuggestionsInputSchema = z.object({
  searchTerm: z.string().min(2, "Search term must be at least 2 characters long."),
});
export type GetNodeSuggestionsInput = z.infer<typeof GetNodeSuggestionsInputSchema>;

const NodeSuggestionSchema = z.object({
  value: z.string(), 
  display: z.string(), 
  type: z.enum(['alias', 'nodeId']),
  rank: z.number().optional().nullable(), 
});
export type NodeSuggestion = z.infer<typeof NodeSuggestionSchema>;

const GetNodeSuggestionsOutputSchema = z.array(NodeSuggestionSchema);
export type GetNodeSuggestionsOutput = z.infer<typeof GetNodeSuggestionsOutputSchema>;

// This function now calls the internal API
async function fetchSuggestionsFromAPI(searchTerm: string): Promise<GetNodeSuggestionsOutput> {
  if (searchTerm.trim().length < 2) return [];

  // Determine the full URL for the fetch call.
  // If running in a server environment where `fetch` needs a full URL:
  const host = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'; // Fallback for local dev
  const fullApiUrl = `${host}${API_BASE_URL}/suggestions?searchTerm=${encodeURIComponent(searchTerm.trim())}`;
  
  try {
    const response = await fetch(fullApiUrl); // Use the full URL
    if (!response.ok) {
      console.error(`API Error forgetNodeSuggestionsFlow (fetchSuggestionsFromAPI for term "${searchTerm}"): ${response.status} ${response.statusText}`);
      const errorBody = await response.text();
      console.error("Error body:", errorBody);
      return [];
    }
    const data = await response.json();
    return data as GetNodeSuggestionsOutput; // Assume API returns data in the correct shape
  } catch (error: any) {
    console.error(`Network error or JSON parsing error in getNodeSuggestionsFlow (fetchSuggestionsFromAPI for term "${searchTerm}"):`, error.message);
    return [];
  }
}

// Genkit flow runner remains, but its implementation calls fetchSuggestionsFromAPI
const getNodeSuggestionsFlowRunner = ai.defineFlow(
  {
    name: 'getNodeSuggestionsFlow',
    inputSchema: GetNodeSuggestionsInputSchema,
    outputSchema: GetNodeSuggestionsOutputSchema,
  },
  async (input) => {
    return fetchSuggestionsFromAPI(input.searchTerm);
  }
);

// Exported function remains the same for the UI to call, but now it uses the flow runner
export async function getNodeSuggestions(input: GetNodeSuggestionsInput): Promise<GetNodeSuggestionsOutput> {
  if (!input.searchTerm || input.searchTerm.trim().length < 2) {
    return [];
  }
  // Call the flow runner which internally calls the API
  return getNodeSuggestionsFlowRunner(input);
}
