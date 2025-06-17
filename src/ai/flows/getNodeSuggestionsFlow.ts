
'use server';
/**
 * @fileOverview Provides autocomplete suggestions for node IDs and aliases from the betweenness table.
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
  rank: z.number().nullable().optional(), // Rank information (e.g., for common payments)
});
export type NodeSuggestion = z.infer<typeof NodeSuggestionSchema>;

const GetNodeSuggestionsOutputSchema = z.array(NodeSuggestionSchema);
export type GetNodeSuggestionsOutput = z.infer<typeof GetNodeSuggestionsOutputSchema>;

async function fetchSuggestionsFromBetweennessTable(searchTerm: string): Promise<GetNodeSuggestionsOutput> {
  if (searchTerm.trim().length < 2) return [];

  try {
    await ensureBigQueryClientInitialized();
  } catch (initError: any) {
    logBigQueryError("getNodeSuggestionsFlow (fetchSuggestionsFromBetweennessTable - client init)", initError);
    return [];
  }
  const bigquery = getBigQueryClient();

  if (!bigquery) {
    logBigQueryError("getNodeSuggestionsFlow (fetchSuggestionsFromBetweennessTable)", new Error("BigQuery client not available."));
    return [];
  }

  const cleanedSearchTerm = searchTerm.trim();
  const suggestions: NodeSuggestion[] = [];

  try {
    // Query for aliases from betweenness table
    const aliasQuery = `
      WITH LatestNodeInfo AS (
        SELECT
          nodeid,
          alias,
          rank,
          ROW_NUMBER() OVER (PARTITION BY nodeid ORDER BY timestamp DESC) as rn
        FROM \`${projectId}.${datasetId}.betweenness\`
        WHERE type = 'common' -- Focus on 'common' type for general suggestions
      )
      SELECT
        lni.nodeid as value,
        lni.alias as display_string,
        'alias' as type,
        lni.rank
      FROM LatestNodeInfo lni
      WHERE lni.rn = 1
        AND lni.alias IS NOT NULL AND TRIM(lni.alias) != ''
        AND LOWER(lni.alias) LIKE LOWER(@searchTermWildcard)
      ORDER BY
        CASE
          WHEN LOWER(lni.alias) = LOWER(@searchTermExact) THEN 1
          WHEN LOWER(lni.alias) LIKE LOWER(@searchTermPrefix) THEN 2
          ELSE 3
        END,
        LENGTH(lni.alias) ASC,
        lni.alias ASC
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
          rank: r.rank !== null && r.rank !== undefined ? Number(r.rank) : null,
        });
      }
    });

    // Query for Node IDs from betweenness table if we still need more suggestions
    if (suggestions.length < 5) {
      const nodeIdLimit = 5 - suggestions.length;
      const nodeIdQuery = `
        WITH LatestNodeInfo AS (
          SELECT
            nodeid,
            alias,
            rank,
            ROW_NUMBER() OVER (PARTITION BY nodeid ORDER BY timestamp DESC) as rn
          FROM \`${projectId}.${datasetId}.betweenness\`
          WHERE type = 'common' -- Focus on 'common' type
        )
        SELECT
          lni.nodeid as value,
          COALESCE(lni.alias, CONCAT(SUBSTR(lni.nodeid, 1, 8), '...', SUBSTR(lni.nodeid, LENGTH(lni.nodeid) - 7))) as display,
          IF(lni.alias IS NOT NULL AND TRIM(lni.alias) != '', 'alias', 'nodeId') as type,
          lni.rank
        FROM LatestNodeInfo lni
        WHERE lni.rn = 1
          AND LOWER(lni.nodeid) LIKE LOWER(@searchTermPrefix)
          AND lni.nodeid NOT IN UNNEST(COALESCE(@existingValues, [])) -- Avoid duplicates and handle empty array
        ORDER BY lni.nodeid ASC
        LIMIT @limit
      `;
      
      const existingValuesParam = suggestions.map(s => s.value);
      const nodeIdJobOptions: QueryJobOptions = {
        query: nodeIdQuery,
        params: {
          searchTermPrefix: `${cleanedSearchTerm}%`,
          existingValues: existingValuesParam.length > 0 ? existingValuesParam : [], // Pass empty array if no existing values
          limit: nodeIdLimit
        },
        types: { // Explicitly define type for array parameter if it might be empty
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
                rank: r.rank !== null && r.rank !== undefined ? Number(r.rank) : null,
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
        // Fallback to rank if available, lower rank is better
        if (a.rank !== null && b.rank !== null && a.rank !== b.rank) return a.rank - b.rank;
        if (a.rank !== null && b.rank === null) return -1;
        if (a.rank === null && b.rank !== null) return 1;
        // Fallback to localeCompare on display string
        return a.display.localeCompare(b.display);
    });

    return suggestions.slice(0, 5);

  } catch (error: any) {
    logBigQueryError(`getNodeSuggestionsFlow (fetchSuggestionsFromBetweennessTable for term "${searchTerm}")`, error);
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
    return fetchSuggestionsFromBetweennessTable(input.searchTerm);
  }
);

export async function getNodeSuggestions(input: GetNodeSuggestionsInput): Promise<GetNodeSuggestionsOutput> {
  if (!input.searchTerm || input.searchTerm.trim().length < 2) {
    return [];
  }
  return getNodeSuggestionsFlowRunner(input);
}
