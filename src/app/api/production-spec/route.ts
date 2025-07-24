// /src/app/api/production-spec/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic'; // Ensures the route is not statically cached

export async function GET(request: NextRequest) {
  const productionSpecUrl = 'https://5sats.com/api/openapi.yaml';

  try {
    // Fetch the spec from the production server
    const response = await fetch(productionSpecUrl, {
      // Use no-cache to ensure we always get the latest version from the production server
      cache: 'no-store',
    });

    // Check if the request to the production server was successful
    if (!response.ok) {
      // If not, return an error response to our client
      return new NextResponse(
        `Failed to fetch production spec: ${response.status} ${response.statusText}`,
        { status: response.status }
      );
    }

    // Get the content type from the original response
    const contentType = response.headers.get('content-type') || 'text/yaml';
    
    // Stream the response body back to the client
    const body = response.body;

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
      },
    });

  } catch (error) {
    console.error('Error fetching production spec:', error);
    return new NextResponse('Internal Server Error while fetching production spec.', {
      status: 500,
    });
  }
}
