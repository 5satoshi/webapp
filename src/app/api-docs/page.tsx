'use client';

import { useEffect, useRef } from 'react';
import { PageTitle } from '@/components/ui/page-title';
import { Card, CardContent } from '@/components/ui/card';

// SwaggerUIInitializer component updated to handle multiple spec URLs
const SwaggerUIInitializer = () => {
  const swaggerUIRoot = useRef<HTMLDivElement>(null);
  const swaggerUIInstance = useRef<any>(null);

  useEffect(() => {
    // Dynamically import SwaggerUIBundle to ensure it runs client-side
    import('swagger-ui-dist').then(swaggerUI => {
      if (swaggerUIRoot.current && !swaggerUIInstance.current) {
        // Initialize with multiple spec URLs
        swaggerUIInstance.current = swaggerUI.SwaggerUIBundle({
          dom_id: '#swagger-ui-container', // Matches the div id
          urls: [
            { url: "/api/openapi.yaml", name: "Local" },
            { url: "/api/production-spec", name: "Production (5sats.com)" }
          ],
          "urls.primaryName": "Local", // Default selection
          presets: [
            swaggerUI.SwaggerUIBundle.presets.apis,
            swaggerUI.SwaggerUIStandalonePreset
          ],
          plugins: [
            swaggerUI.SwaggerUIBundle.plugins.DownloadUrl
          ],
          layout: "StandaloneLayout",
          deepLinking: true,
        });
      }
    }).catch(error => {
      console.error("Failed to load Swagger UI Bundle:", error);
      if (swaggerUIRoot.current) {
        swaggerUIRoot.current.innerHTML = '<p>Error loading API documentation. Please try refreshing the page.</p>';
      }
    });

  }, []); // Empty dependency array ensures this runs once on mount

  // Added minHeight to ensure the container is not collapsed
  return <div id="swagger-ui-container" ref={swaggerUIRoot} style={{ minHeight: '800px' }}></div>;
};


export default function ApiDocsPage() {
  return (
    <>
      <link
        key="swagger-css" // React key for the link element
        rel="stylesheet"
        type="text/css"
        // Using a specific version from unpkg consistent with potential installed version
        href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css"
      />
      <div className="space-y-6">
        <PageTitle
          title="API Reference"
          description="Explore the available API endpoints for the Lightning Stats Dashboard. Select a definition to view the local or production API specification."
        />
        <Card>
            <CardContent className="p-4 sm:p-6">
                 <SwaggerUIInitializer />
            </CardContent>
        </Card>
      </div>
    </>
  );
}
