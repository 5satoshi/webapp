// This API endpoint has been removed.
// Node suggestions are now fetched directly from the peers table
// by the getNodeSuggestionsFlow.ts flow.
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'This endpoint is no longer available.' }, { status: 404 });
}
