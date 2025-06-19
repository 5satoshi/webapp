
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('[API /api/betweenness/node-graph] GET request received (SIMPLIFIED TEST).');
  try {
    const searchParams = request.nextUrl.searchParams;
    const centralNodeId = searchParams.get('nodeId');
    console.log(`[API /api/betweenness/node-graph] Central Node ID from params (SIMPLIFIED TEST): ${centralNodeId}`);

    if (!centralNodeId) {
      console.error('[API /api/betweenness/node-graph] Error: nodeId parameter is required (SIMPLIFIED TEST).');
      return NextResponse.json({ error: 'nodeId parameter is required' }, { status: 400 });
    }

    // Return a static response for testing
    const testResponse = {
      message: "Simplified test response from /api/betweenness/node-graph",
      nodeId: centralNodeId,
      nodes: [{ id: centralNodeId, name: "Central Node (Test)", val: 10, isCentralNode: true, color: 'hsl(var(--primary))' }],
      links: []
    };
    console.log('[API /api/betweenness/node-graph] Responding with simplified test data.');
    return NextResponse.json(testResponse);

  } catch (error: any) {
    console.error(`[API /api/betweenness/node-graph] CRITICAL ERROR in GET handler (SIMPLIFIED TEST): ${error.message}`, error);
    return NextResponse.json({ error: 'Failed to process request (simplified test)', details: error.message }, { status: 500 });
  }
}

// Ensure we opt into dynamic rendering
export const dynamic = 'force-dynamic';
