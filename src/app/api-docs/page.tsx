
'use client';

import { useEffect, useRef } from 'react';
import { PageTitle } from '@/components/ui/page-title';

// SwaggerUIInitializer component remains the same internally
const SwaggerUIInitializer = () => {
  const swaggerUIRoot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Dynamically import SwaggerUIBundle to ensure it runs client-side
    import('swagger-ui-dist/swagger-ui-bundle.js').then(module => {
      const SwaggerUIBundle = module.default || module;
      if (SwaggerUIBundle && swaggerUIRoot.current) {
        // Ensure the container is empty before initializing to prevent duplicates
        if (swaggerUIRoot.current.innerHTML === '') {
          SwaggerUIBundle({
            url: "/api/openapi.yaml", // Path to your OpenAPI spec in the public directory
            dom_id: '#swagger-ui-container', // Matches the div id
            presets: [
              SwaggerUIBundle.presets.apis,
            ],
            deepLinking: true,
          });
        }
      }
    }).catch(error => {
      console.error("Failed to load Swagger UI Bundle:", error);
      if (swaggerUIRoot.current) {
        swaggerUIRoot.current.innerHTML = '<p>Error loading API documentation. Please try refreshing the page.</p>';
      }
    });

    // Cleanup function
    return () => {
      if (swaggerUIRoot.current) {
        // Clear the container's content when the component unmounts or effect re-runs
        swaggerUIRoot.current.innerHTML = '';
      }
    };
  }, []); // Empty dependency array ensures this runs once on mount and cleans up on unmount

  // Added minHeight to ensure the container is not collapsed
  return <div id="swagger-ui-container" ref={swaggerUIRoot} style={{ minHeight: '600px' }}></div>;
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
          description="Explore the available API endpoints for the Lightning Stats Dashboard."
        />
        <div className="bg-card p-4 sm:p-6 rounded-lg shadow">
          <SwaggerUIInitializer />
        </div>
      </div>
    </>
  );
}
