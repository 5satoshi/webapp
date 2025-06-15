
'use server';
/**
 * @fileOverview Provides autocomplete suggestions for node IDs and aliases from the peers table.
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

const GetNodeSuggestionsInputSchema = z.object({
  searchTerm: z.string().min(2, "Search term must be at least 2 characters long."),
});
export type GetNodeSuggestionsInput = z.infer<typeof GetNodeSuggestionsInputSchema>;

const NodeSuggestionSchema = z.object({
  value: z.string(), // This will be the Node ID
  display: z.string(), // This can be the alias or a formatted Node ID
  type: z.enum(['alias', 'nodeId']),
  // Rank is removed as peers table doesn't have this info and alias is assumed to be alias.local
});
export type NodeSuggestion = z.infer<typeof NodeSuggestionSchema>;

const GetNodeSuggestionsOutputSchema = z.array(NodeSuggestionSchema);
export type GetNodeSuggestionsOutput = z.infer<typeof GetNodeSuggestionsOutputSchema>;

async function fetchSuggestionsFromPeersTable(searchTerm: string): Promise<GetNodeSuggestionsOutput> {
  if (searchTerm.trim().length < 2) return [];

  try {
    await ensureBigQueryClientInitialized();
  } catch (initError: any) {
    logBigQueryError("getNodeSuggestionsFlow (fetchSuggestionsFromPeersTable - client init)", initError);
    return [];
  }
  const bigquery = getBigQueryClient();

  if (!bigquery) {
    logBigQueryError("getNodeSuggestionsFlow (fetchSuggestionsFromPeersTable)", new Error("BigQuery client not available."));
    return [];
  }

  const cleanedSearchTerm = searchTerm.trim();
  const suggestions: NodeSuggestion[] = [];

  try {
    // Query for aliases, assuming alias is a struct and we use alias.local
    const aliasQuery = `
      SELECT
        id as value,
        alias.local as display_string,
        'alias' as type
      FROM \`${projectId}.${datasetId}.peers\`
      WHERE LOWER(alias.local) LIKE LOWER(@searchTermWildcard)
        AND alias.local IS NOT NULL AND TRIM(alias.local) != ''
      ORDER BY
        CASE
          WHEN LOWER(alias.local) = LOWER(@searchTermExact) THEN 1
          WHEN LOWER(alias.local) LIKE LOWER(@searchTermPrefix) THEN 2
          ELSE 3
        END,
        LENGTH(alias.local) ASC,
        alias.local ASC
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

    // Query for Node IDs if we still need more suggestions
    if (suggestions.length < 5) {
      const nodeIdLimit = 5 - suggestions.length;
      const nodeIdQuery = `
        SELECT
          id as value,
          CONCAT(SUBSTR(id, 1, 8), '...', SUBSTR(id, LENGTH(id) - 7)) as display,
          'nodeId' as type
        FROM \`${projectId}.${datasetId}.peers\`
        WHERE LOWER(id) LIKE LOWER(@searchTermPrefix)
          AND id NOT IN (SELECT value FROM UNNEST(@existingValues)) -- Avoid duplicates if an ID matched an alias
        LIMIT @limit
      `;
      const [nodeIdJob] = await bigquery.createQueryJob({
        query: nodeIdQuery,
        params: {
          searchTermPrefix: `${cleanedSearchTerm}%`,
          existingValues: suggestions.map(s => s.value),
          limit: nodeIdLimit
        }
      });
      const nodeIdRows = (await nodeIdJob.getQueryResults())[0];
      nodeIdRows.forEach((r: any) => {
         if (r.value && r.display && !suggestions.some(s => s.value === r.value)) {
            suggestions.push({
                value: String(r.value),
                display: String(r.display),
                type: 'nodeId',
            });
         }
      });
    }
    return suggestions.slice(0, 5);

  } catch (error: any) {
    logBigQueryError(`getNodeSuggestionsFlow (fetchSuggestionsFromPeersTable for term "${searchTerm}")`, error);
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
    return fetchSuggestionsFromPeersTable(input.searchTerm);
  }
);

export async function getNodeSuggestions(input: GetNodeSuggestionsInput): Promise<GetNodeSuggestionsOutput> {
  if (!input.searchTerm || input.searchTerm.trim().length < 2) {
    return [];
  }
  return getNodeSuggestionsFlowRunner(input);
}
