
'use client';

import { useEffect, useRef } from 'react';
import { PageTitle } from '@/components/ui/page-title';

// SwaggerUIInitializer component updated to handle multiple spec URLs
const SwaggerUIInitializer = () => {
  const swaggerUIRoot = useRef<HTMLDivElement>(null);
  const swaggerUIInstance = useRef<any>(null);

  useEffect(() => {
    // Dynamically import SwaggerUIBundle to ensure it runs client-side
    import('swagger-ui-dist/swagger-ui-bundle.js').then(module => {
      const SwaggerUIBundle = module.default || module;
      if (SwaggerUIBundle && swaggerUIRoot.current && !swaggerUIInstance.current) {
        // Initialize with multiple spec URLs
        swaggerUIInstance.current = SwaggerUIBundle({
          dom_id: '#swagger-ui-container', // Matches the div id
          urls: [
            { url: "/api/openapi.yaml", name: "Local" },
            { url: "https://5sats.com/api/openapi.yaml", name: "Production (5sats.com)" }
          ],
          "urls.primaryName": "Local", // Default selection
          presets: [
            SwaggerUIBundle.presets.apis,
          ],
          deepLinking: true,
          layout: "StandaloneLayout",
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
        <div className="bg-card p-4 sm:p-6 rounded-lg shadow">
          <SwaggerUIInitializer />
        </div>
      </div>
    </>
  );
}
