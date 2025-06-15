
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getBigQueryClient, ensureBigQueryClientInitialized, projectId, datasetId } from '@/services/bigqueryClient';
import { logBigQueryError } from '@/lib/bigqueryUtils';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const alias = searchParams.get('alias');

    if (!alias || alias.trim() === '') {
      return NextResponse.json({ error: 'alias parameter is required' }, { status: 400 });
    }

    await ensureBigQueryClientInitialized();
    const bigquery = getBigQueryClient();

    if (!bigquery) {
      logBigQueryError("API /api/betweenness/resolve-alias", new Error("BigQuery client not available."));
      return NextResponse.json({ nodeId: null });
    }

    const query = `
      SELECT nodeid
      FROM \`${projectId}.${datasetId}.betweenness\`
      WHERE alias = @aliasToQuery
      ORDER BY timestamp DESC
      LIMIT 1
    `;
    const options = {
      query: query,
      params: { aliasToQuery: alias.trim() }
    };

    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    let nodeId: string | null = null;
    if (rows && rows.length > 0 && rows[0] && rows[0].nodeid) {
      nodeId = String(rows[0].nodeid);
    }
    return NextResponse.json({ nodeId });

  } catch (error: any) {
    logBigQueryError('API /api/betweenness/resolve-alias', error);
    return NextResponse.json({ nodeId: null }, { status: 500 });
  }
}
