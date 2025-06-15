
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getBigQueryClient, ensureBigQueryClientInitialized, projectId, datasetId } from '@/services/bigqueryClient';
import { logBigQueryError } from '@/lib/bigqueryUtils';
import type { NodeDisplayInfo } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const nodeId = searchParams.get('nodeId');

    if (!nodeId) {
      return NextResponse.json({ error: 'nodeId parameter is required' }, { status: 400 });
    }
    
    await ensureBigQueryClientInitialized();
    const bigquery = getBigQueryClient();
    
    if (!bigquery) {
      logBigQueryError("API /api/betweenness/node-info", new Error("BigQuery client not available."));
      return NextResponse.json({ nodeId: nodeId, alias: null } as NodeDisplayInfo);
    }

    const query = `
      SELECT alias
      FROM \`${projectId}.${datasetId}.betweenness\`
      WHERE nodeid = @nodeIdToQuery
        AND alias IS NOT NULL AND TRIM(alias) != ''
      ORDER BY timestamp DESC
      LIMIT 1
    `;
    const options = {
      query: query,
      params: { nodeIdToQuery: nodeId }
    };

    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    let responseData: NodeDisplayInfo;
    if (rows && rows.length > 0 && rows[0] && rows[0].alias) {
      responseData = {
        nodeId: nodeId,
        alias: String(rows[0].alias),
      };
    } else {
      responseData = { nodeId: nodeId, alias: null };
    }
    return NextResponse.json(responseData);

  } catch (error: any) {
    logBigQueryError('API /api/betweenness/node-info', error);
    const nodeIdParam = new URL(request.url).searchParams.get('nodeId') || 'unknown';
    // Return a default structure even on error to avoid breaking client parsing if possible
    return NextResponse.json({ nodeId: nodeIdParam, alias: null } as NodeDisplayInfo, { status: 500 });
  }
}
