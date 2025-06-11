
'use server';
/**
 * @fileOverview Provides autocomplete suggestions for node IDs and aliases, including their latest common rank.
 *
 * - getNodeSuggestions - Fetches suggestions based on a search term.
 * - GetNodeSuggestionsInput - Input type for the getNodeSuggestions function.
 * - NodeSuggestion - Type for a single suggestion, now includes optional rank.
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
  value: z.string(), 
  display: z.string(), 
  type: z.enum(['alias', 'nodeId']),
  rank: z.number().optional().nullable(), 
});
export type NodeSuggestion = z.infer<typeof NodeSuggestionSchema>;

const GetNodeSuggestionsOutputSchema = z.array(NodeSuggestionSchema);
export type GetNodeSuggestionsOutput = z.infer<typeof GetNodeSuggestionsOutputSchema>;


async function fetchSuggestionsFromBQ(searchTerm: string): Promise<GetNodeSuggestionsOutput> {
  await ensureBigQueryClientInitialized();
  const bigquery = getBigQueryClient();
  
  if (!bigquery) {
    logBigQueryError("getNodeSuggestionsFlow (fetchSuggestionsFromBQ)", new Error("BigQuery client not available."));
    return []; 
  }

  const cleanedSearchTerm = searchTerm.trim();
  if (cleanedSearchTerm.length < 2) return [];

  const aliasQuery = `
    WITH RankedAliases AS (
      SELECT
        alias,
        rank,
        ROW_NUMBER() OVER(PARTITION BY alias ORDER BY timestamp DESC) as rn
      FROM \`${projectId}.${datasetId}.betweenness\`
      WHERE LOWER(alias) LIKE LOWER(@searchTermWildcard)
        AND alias IS NOT NULL AND TRIM(alias) != ''
        AND type = 'common'
    )
    SELECT
      alias AS value,
      alias AS display,
      'alias' AS type,
      rank
    FROM RankedAliases
    WHERE rn = 1
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
    WITH RankedNodeIDs AS (
      SELECT
        nodeid,
        rank,
        ROW_NUMBER() OVER(PARTITION BY nodeid ORDER BY timestamp DESC) as rn
      FROM \`${projectId}.${datasetId}.betweenness\`
      WHERE nodeid LIKE @searchTermPrefix
        AND type = 'common'
    )
    SELECT
      nodeid AS value,
      CONCAT(SUBSTR(nodeid, 1, 8), '...', SUBSTR(nodeid, LENGTH(nodeid) - 7)) AS display,
      'nodeId' AS type,
      rank
    FROM RankedNodeIDs
    WHERE rn = 1
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
        type: 'alias',
        rank: r.rank !== null && r.rank !== undefined ? Number(r.rank) : null,
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
            type: 'nodeId',
            rank: r.rank !== null && r.rank !== undefined ? Number(r.rank) : null,
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
    logBigQueryError(`getNodeSuggestionsFlow for term "${searchTerm}"`, error);
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
  // Directly call fetchSuggestionsFromBQ as it now handles ensureBigQueryClientInitialized
  return fetchSuggestionsFromBQ(input.searchTerm);
}
