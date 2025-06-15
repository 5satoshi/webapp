// This API endpoint has been removed.
// Node display info (alias for a node ID) is now fetched directly
// from the peers table by the subsumptionService.ts.
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'This endpoint is no longer available.' }, { status: 404 });
}
