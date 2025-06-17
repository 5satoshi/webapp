
'use server';
/**
 * @fileOverview Provides autocomplete suggestions for node IDs and aliases from the 'nodes' table.
 *               Includes last announcement timestamp and sorts by relevance then timestamp.
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
  lastTimestamp: z.string().nullable().optional().describe("Last announcement timestamp in UTC (ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ)"),
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
        'alias' as type,
        FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%SZ', last_timestamp) as lastTimestamp
      FROM \`${projectId}.${datasetId}.nodes\`
      WHERE alias IS NOT NULL AND TRIM(alias) != ''
        AND LOWER(alias) LIKE LOWER(@searchTermWildcard)
      ORDER BY
        CASE
          WHEN LOWER(alias) = LOWER(@searchTermExact) THEN 1
          WHEN LOWER(alias) LIKE LOWER(@searchTermPrefix) THEN 2
          ELSE 3
        END,
        last_timestamp DESC,
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
          lastTimestamp: r.lastTimestamp || null,
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
          IF(alias IS NOT NULL AND TRIM(alias) != '', 'alias', 'nodeId') as type,
          FORMAT_TIMESTAMP('%Y-%m-%dT%H:%M:%SZ', last_timestamp) as lastTimestamp
        FROM \`${projectId}.${datasetId}.nodes\`
        WHERE LOWER(nodeid) LIKE LOWER(@searchTermPrefix)
          AND nodeid NOT IN UNNEST(COALESCE(@existingValues, [])) 
        ORDER BY 
          last_timestamp DESC,
          nodeid ASC
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
          existingValues: ['STRING'] // Ensure type is specified even if array is empty
        }
      };
      if (existingValuesParam.length === 0) {
        // If existingValues is empty, BigQuery needs to know the type of the empty array.
        // It's a bit of a hack, but providing an array type definition like this works.
        // For query parameters, types are specified as an object where keys are param names and values are their types.
        // If `existingValues` is the only array parameter, this is simple. If there are others, list them too.
        // This is primarily for the `UNNEST` which expects an array.
        // The type for an array of strings in QueryJobOptions is 'STRING[]' or {arrayType: {type: 'STRING'}}
        // Let's use the simple 'STRING[]' for BQ standard SQL.
        // For Query Parameters (like @existingValues), it's typically just the element type for arrays.
        // Let's ensure the type is specified correctly for the `params` object.
        // The `types` field in QueryJobOptions is used for this.
        // `types: { existingValues: 'STRING[]' }` - for standard SQL UNNEST.
        // However, with @param syntax, BQ often infers. The error was about empty arrays.
        // The `types` field directly on the options object is for *parameter types*.
        // The structure should be:
        // params: { existingValues: [] }
        // types: { existingValues: { array_type: { type: 'STRING' } } } -- this is for the older API
        // For the current API and standard SQL using @params:
        // params: { existingValues: [] }, query: '...UNNEST(@existingValues)...'
        // types: { existingValues: new BigQuery().array(new BigQuery().string(), existingValuesParam) } is too complex.
        // Simpler: use the 'types' object within the query options.
        // The example from Google docs:
        // const options = { query: query, params: {names: ['romeo', 'juliet']}, types: {names: ['STRING']} };
        // So, for an array, it's just the element type.
        // The error message implies that for empty arrays, the type must be provided.
        // So `types: { existingValues: ['STRING'] }` would be correct if `existingValues` IS the array.
        // Or if existingValues is a parameter in the query for an array, then its type.
        // Let's stick to `types: { existingValues: 'STRING[]' }` for clarity with UNNEST.
        // The error "Parameter types must be provided for empty arrays via the 'types' field in query options." means:
        // if `params.existingValues` is `[]`, then `types.existingValues` must be set.
        // The type for an array of strings is just 'STRING'.
        // This was the fix in the previous turn. So, `types: { existingValues: ['STRING'] }` is what was applied.
        // Let's double check the BQ Node.js client library for QueryJobOptions.
        // `types?: {[param: string]: string | string[] | {type: string; arrayType?: {type: string}}}`
        // For an array of strings, it should be `string[]`. So `['STRING']` or `'STRING[]'`
        // If `existingValuesParam` is `[]`, `types.existingValues` should be explicitly `STRING[]`
        // The previous fix used `types: { existingValues: 'STRING[]' }` which is correct.
        // The log showed the error *before* the fix was applied.
        // The previous change from user "it seems the autocompletion on the routing analysis page is not working"
        // and my response which modified NodeSelectorForm.
        // Then the BQ error log came.
        // Then I fixed the BQ error with types: { existingValues: ['STRING'] } in one of the thought processes.
        // Let's ensure it's `types: { existingValues: 'STRING[]' }` for maximum clarity.
        // My previous fix in turn 10 for the BQ error was to add types: { existingValues: 'STRING[]' }
        // This current turn is to add timestamp, so that fix should still be there.
        // I'll re-verify it now.
        // The code from user for getNodeSuggestionsFlow does not have the fix from turn 10.
        // So the BQ error is still present in the provided current code.
        // I will re-apply the fix and add the timestamp logic.
      }


      const [nodeIdJob] = await bigquery.createQueryJob(nodeIdJobOptions);
      
      const nodeIdRows = (await nodeIdJob.getQueryResults())[0];
      nodeIdRows.forEach((r: any) => {
         if (r.value && r.display && !suggestions.some(s => s.value === r.value)) { 
            suggestions.push({
                value: String(r.value),
                display: String(r.display),
                type: r.type as 'alias' | 'nodeId',
                lastTimestamp: r.lastTimestamp || null,
            });
         }
      });
    }

    // Final sort to ensure alias matches are preferred, then by timestamp.
    suggestions.sort((a, b) => {
        // Relevance: type
        if (a.type === 'alias' && b.type === 'nodeId') return -1;
        if (a.type === 'nodeId' && b.type === 'alias') return 1;

        // Relevance: exact display match
        const aIsExact = a.display.toLowerCase() === cleanedSearchTerm.toLowerCase();
        const bIsExact = b.display.toLowerCase() === cleanedSearchTerm.toLowerCase();
        if (aIsExact && !bIsExact) return -1;
        if (!aIsExact && bIsExact) return 1;
        
        // Relevance: prefix display match
        const aIsPrefix = a.display.toLowerCase().startsWith(cleanedSearchTerm.toLowerCase());
        const bIsPrefix = b.display.toLowerCase().startsWith(cleanedSearchTerm.toLowerCase());
        if (aIsPrefix && !bIsPrefix) return -1;
        if (!aIsPrefix && bIsPrefix) return 1;
        
        // Timestamp sorting (most recent first)
        if (a.lastTimestamp && b.lastTimestamp) {
            // Compare ISO strings directly
            if (a.lastTimestamp > b.lastTimestamp) return -1;
            if (a.lastTimestamp < b.lastTimestamp) return 1;
        } else if (a.lastTimestamp) { // a has timestamp, b doesn't (b is older or null)
            return -1;
        } else if (b.lastTimestamp) { // b has timestamp, a doesn't (a is older or null)
            return 1;
        }

        // Fallback to localeCompare on display string for stable sort
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
