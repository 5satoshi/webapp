
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getBigQueryClient, ensureBigQueryClientInitialized, projectId, datasetId } from '@/services/bigqueryClient';
import { logBigQueryError } from '@/lib/bigqueryUtils';
import type { NodeSuggestion } from '@/ai/flows/getNodeSuggestionsFlow'; // Re-use the type

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const searchTerm = searchParams.get('searchTerm');

    if (!searchTerm || searchTerm.trim().length < 2) {
      return NextResponse.json({ error: 'searchTerm must be at least 2 characters long' }, { status: 400 });
    }
    
    await ensureBigQueryClientInitialized();
    const bigquery = getBigQueryClient();

    if (!bigquery) {
      logBigQueryError("API /api/betweenness/suggestions", new Error("BigQuery client not available."));
      return NextResponse.json([]);
    }

    const cleanedSearchTerm = searchTerm.trim();

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
    return NextResponse.json(combinedResults.slice(0, 5));

  } catch (error: any) {
    logBigQueryError('API /api/betweenness/suggestions', error);
    return NextResponse.json([], { status: 500 });
  }
}
