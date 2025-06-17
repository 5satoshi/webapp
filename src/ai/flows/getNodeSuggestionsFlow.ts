
'use server';
/**
 * @fileOverview Provides autocomplete suggestions for node IDs and aliases from the 'nodes' table.
 *
 * - getNodeSuggestions - Fetches suggestions based on a search term by querying BigQuery.
 * - GetNodeSuggestionsInput - Input type for the getNodeSuggestions function.
 * - NodeSuggestion - Type for a single suggestion.
 * - GetNodeSuggestionsOutput - Output type for the getNodeSuggestions function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getBigQueryClient, ensureBigQueryClientInitialized, projectId, datasetId } from '@/services/bigqueryClient';
import { logBigQueryError } from '@/lib/bigqueryUtils';
import type { QueryJobOptions } from '@google-cloud/bigquery';

const GetNodeSuggestionsInputSchema = z.object({
  searchTerm: z.string().min(2, "Search term must be at least 2 characters long."),
});
export type GetNodeSuggestionsInput = z.infer<typeof GetNodeSuggestionsInputSchema>;

const NodeSuggestionSchema = z.object({
  value: z.string(), // Node ID
  display: z.string(), // Alias or formatted Node ID
  type: z.enum(['alias', 'nodeId']),
  // Rank removed as 'nodes' table may not have it.
});
export type NodeSuggestion = z.infer<typeof NodeSuggestionSchema>;

const GetNodeSuggestionsOutputSchema = z.array(NodeSuggestionSchema);
export type GetNodeSuggestionsOutput = z.infer<typeof GetNodeSuggestionsOutputSchema>;

async function fetchSuggestionsFromNodesTable(searchTerm: string): Promise<GetNodeSuggestionsOutput> {
  if (searchTerm.trim().length < 2) return [];

  try {
    await ensureBigQueryClientInitialized();
  } catch (initError: any) {
    logBigQueryError("getNodeSuggestionsFlow (fetchSuggestionsFromNodesTable - client init)", initError);
    return [];
  }
  const bigquery = getBigQueryClient();

  if (!bigquery) {
    logBigQueryError("getNodeSuggestionsFlow (fetchSuggestionsFromNodesTable)", new Error("BigQuery client not available."));
    return [];
  }

  const cleanedSearchTerm = searchTerm.trim();
  const suggestions: NodeSuggestion[] = [];

  try {
    // Query for aliases from nodes table
    const aliasQuery = `
      SELECT
        nodeid as value,
        alias as display_string,
        'alias' as type
      FROM \`${projectId}.${datasetId}.nodes\`
      WHERE alias IS NOT NULL AND TRIM(alias) != ''
        AND LOWER(alias) LIKE LOWER(@searchTermWildcard)
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
    const [aliasJob] = await bigquery.createQueryJob({
      query: aliasQuery,
      params: {
        searchTermWildcard: `%${cleanedSearchTerm}%`,
        searchTermExact: cleanedSearchTerm,
        searchTermPrefix: `${cleanedSearchTerm}%`
      }
    });
    const aliasRows = (await aliasJob.getQueryResults())[0];
    aliasRows.forEach((r: any) => {
      if (r.value && r.display_string) {
        suggestions.push({
          value: String(r.value),
          display: String(r.display_string),
          type: 'alias',
        });
      }
    });

    // Query for Node IDs from nodes table if we still need more suggestions
    if (suggestions.length < 5) {
      const nodeIdLimit = 5 - suggestions.length;
      const nodeIdQuery = `
        SELECT
          nodeid as value,
          COALESCE(NULLIF(TRIM(alias), ''), CONCAT(SUBSTR(nodeid, 1, 8), '...', SUBSTR(nodeid, LENGTH(nodeid) - 7))) as display,
          IF(alias IS NOT NULL AND TRIM(alias) != '', 'alias', 'nodeId') as type
        FROM \`${projectId}.${datasetId}.nodes\`
        WHERE LOWER(nodeid) LIKE LOWER(@searchTermPrefix)
          AND nodeid NOT IN UNNEST(COALESCE(@existingValues, [])) 
        ORDER BY nodeid ASC
        LIMIT @limit
      `;
      
      const existingValuesParam = suggestions.map(s => s.value);
      const nodeIdJobOptions: QueryJobOptions = {
        query: nodeIdQuery,
        params: {
          searchTermPrefix: `${cleanedSearchTerm}%`,
          existingValues: existingValuesParam.length > 0 ? existingValuesParam : [],
          limit: nodeIdLimit
        },
        types: { 
          existingValues: 'STRING[]'
        }
      };

      const [nodeIdJob] = await bigquery.createQueryJob(nodeIdJobOptions);
      
      const nodeIdRows = (await nodeIdJob.getQueryResults())[0];
      nodeIdRows.forEach((r: any) => {
         if (r.value && r.display && !suggestions.some(s => s.value === r.value)) { 
            suggestions.push({
                value: String(r.value),
                display: String(r.display),
                type: r.type as 'alias' | 'nodeId',
            });
         }
      });
    }

    // Final sort to ensure alias matches are preferred overall
    suggestions.sort((a, b) => {
        if (a.type === 'alias' && b.type === 'nodeId') return -1;
        if (a.type === 'nodeId' && b.type === 'alias') return 1;
        // Prioritize exact matches for display string
        if (a.display.toLowerCase() === cleanedSearchTerm.toLowerCase() && b.display.toLowerCase() !== cleanedSearchTerm.toLowerCase()) return -1;
        if (a.display.toLowerCase() !== cleanedSearchTerm.toLowerCase() && b.display.toLowerCase() === cleanedSearchTerm.toLowerCase()) return 1;
        // Prioritize prefix matches for display string
        if (a.display.toLowerCase().startsWith(cleanedSearchTerm.toLowerCase()) && !b.display.toLowerCase().startsWith(cleanedSearchTerm.toLowerCase())) return -1;
        if (!a.display.toLowerCase().startsWith(cleanedSearchTerm.toLowerCase()) && b.display.toLowerCase().startsWith(cleanedSearchTerm.toLowerCase())) return 1;
        // Fallback to localeCompare on display string
        return a.display.localeCompare(b.display);
    });

    return suggestions.slice(0, 5);

  } catch (error: any) {
    logBigQueryError(`getNodeSuggestionsFlow (fetchSuggestionsFromNodesTable for term "${searchTerm}")`, error);
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
    return fetchSuggestionsFromNodesTable(input.searchTerm);
  }
);

export async function getNodeSuggestions(input: GetNodeSuggestionsInput): Promise<GetNodeSuggestionsOutput> {
  if (!input.searchTerm || input.searchTerm.trim().length < 2) {
    return [];
  }
  return getNodeSuggestionsFlowRunner(input);
}
