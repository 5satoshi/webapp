// This API endpoint has been removed.
// Alias to Node ID resolution is now performed by querying the peers table
// directly in subsumptionService.ts.
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'This endpoint is no longer available.' }, { status: 404 });
}
