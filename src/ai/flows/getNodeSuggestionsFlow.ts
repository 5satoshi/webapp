
'use server';
/**
 * @fileOverview Provides autocomplete suggestions for node IDs and aliases.
 *
 * - getNodeSuggestions - Fetches suggestions based on a search term.
 * - GetNodeSuggestionsInputSchema - Input schema for the flow.
 * - NodeSuggestionSchema - Schema for a single suggestion.
 * - GetNodeSuggestionsOutputSchema - Output schema for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { BigQuery } from '@google-cloud/bigquery';

const projectId = process.env.BIGQUERY_PROJECT_ID || 'lightning-fee-optimizer';
const datasetId = process.env.BIGQUERY_DATASET_ID || 'version_1';

// Initialize BigQuery client.
// This might be better configured globally or passed if running in diverse Genkit environments.
let bqInstance: BigQuery | undefined;
function getBigQueryClient() {
  if (!bqInstance) {
    try {
      bqInstance = new BigQuery({ projectId });
    } catch (error) {
      console.error("Failed to initialize BigQuery client in getNodeSuggestionsFlow:", error);
      throw error; // Rethrow to indicate failure
    }
  }
  return bqInstance;
}

export const GetNodeSuggestionsInputSchema = z.object({
  searchTerm: z.string().min(2, "Search term must be at least 2 characters long."),
});
export type GetNodeSuggestionsInput = z.infer<typeof GetNodeSuggestionsInputSchema>;

export const NodeSuggestionSchema = z.object({
  value: z.string(), // The actual node ID or full alias
  display: z.string(), // What's shown in the dropdown (e.g., truncated ID or alias)
  type: z.enum(['alias', 'nodeId']),
});
export type NodeSuggestion = z.infer<typeof NodeSuggestionSchema>;

export const GetNodeSuggestionsOutputSchema = z.array(NodeSuggestionSchema);
export type GetNodeSuggestionsOutput = z.infer<typeof GetNodeSuggestionsOutputSchema>;


async function fetchSuggestionsFromBQ(searchTerm: string): Promise<GetNodeSuggestionsOutput> {
  let bigquery;
  try {
    bigquery = getBigQueryClient();
  } catch (error) {
    return []; // Return empty if BQ client failed to init
  }

  const cleanedSearchTerm = searchTerm.trim();
  if (cleanedSearchTerm.length < 2) return [];

  const aliasQuery = `
    SELECT DISTINCT
      alias AS value,
      alias AS display,
      'alias' AS type
    FROM \`${projectId}.${datasetId}.betweenness\`
    WHERE LOWER(alias) LIKE LOWER(@searchTermWildcard)
      AND alias IS NOT NULL AND TRIM(alias) != ''
    ORDER BY
      CASE
        WHEN LOWER(alias) = LOWER(@searchTermExact) THEN 1
        WHEN LOWER(alias) LIKE LOWER(@searchTermPrefix) THEN 2
        ELSE 3
      END,
      LENGTH(alias) ASC,
      alias ASC
    LIMIT 5
  `;

  const nodeIdQuery = `
    SELECT DISTINCT
      nodeid AS value,
      CONCAT(SUBSTR(nodeid, 1, 8), '...', SUBSTR(nodeid, LENGTH(nodeid) - 7)) AS display,
      'nodeId' AS type
    FROM \`${projectId}.${datasetId}.betweenness\`
    WHERE nodeid LIKE @searchTermPrefix -- Node IDs are hex, typically no need for LOWER() unless input varies
    LIMIT @nodeIdLimit
  `;

  try {
    const [aliasJob] = await bigquery.createQueryJob({
      query: aliasQuery,
      params: {
        searchTermWildcard: `%${cleanedSearchTerm}%`,
        searchTermExact: cleanedSearchTerm,
        searchTermPrefix: `${cleanedSearchTerm}%`
      }
    });
    const aliasRows = (await aliasJob.getQueryResults())[0];
    const aliasResults: NodeSuggestion[] = aliasRows.map((r: any) => ({
        value: String(r.value),
        display: String(r.display),
        type: 'alias'
    }));


    let combinedResults = aliasResults;

    if (combinedResults.length < 5) {
      const nodeIdLimit = 5 - combinedResults.length;
      if (nodeIdLimit > 0) {
        const [nodeIdJob] = await bigquery.createQueryJob({
          query: nodeIdQuery,
          params: {
            searchTermPrefix: `${cleanedSearchTerm}%`,
            nodeIdLimit: nodeIdLimit
          }
        });
        const nodeIdRows = (await nodeIdJob.getQueryResults())[0];
        const nodeIdResults: NodeSuggestion[] = nodeIdRows.map((r: any) => ({
            value: String(r.value),
            display: String(r.display),
            type: 'nodeId'
        }));

        const existingValues = new Set(combinedResults.map(r => r.value));
        for (const nodeIdRes of nodeIdResults) {
          if (!existingValues.has(nodeIdRes.value)) {
            combinedResults.push(nodeIdRes);
            existingValues.add(nodeIdRes.value);
          }
          if (combinedResults.length >= 5) break;
        }
      }
    }
    return combinedResults.slice(0, 5);
  } catch (error: any) {
    console.error(`BigQuery Error in getNodeSuggestionsFlow for term "${searchTerm}":`, error.message);
    if (error.errors) console.error('Detailed BQ Errors:', JSON.stringify(error.errors, null, 2));
    return [];
  }
}

const getNodeSuggestionsFlowRunner = ai.defineFlow(
  {
    name: 'getNodeSuggestionsFlow',
    inputSchema: GetNodeSuggestionsInputSchema,
    outputSchema: GetNodeSuggestionsOutputSchema,
  },
  async (input) => {
    return fetchSuggestionsFromBQ(input.searchTerm);
  }
);

export async function getNodeSuggestions(input: GetNodeSuggestionsInput): Promise<GetNodeSuggestionsOutput> {
  if (!input.searchTerm || input.searchTerm.trim().length < 2) {
    return [];
  }
  // Directly call the BQ fetch logic for server actions to ensure proper context
  // This avoids potential issues with Genkit flow runner context in Next.js server actions.
  return fetchSuggestionsFromBQ(input.searchTerm);
}
