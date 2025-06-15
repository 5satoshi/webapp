
'use client';

import Head from 'next/head';
import { useEffect, useRef } from 'react';
import { PageTitle } from '@/components/ui/page-title';

// It's important to load Swagger UI scripts and CSS.
// We're using unpkg CDN links here.
// Ensure these versions are suitable or manage them locally if preferred.

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
              SwaggerUIBundle.SwaggerUIStandalonePreset
            ],
            layout: "StandaloneLayout",
            deepLinking: true,
            // You can add more Swagger UI options here
            // e.g., defaultModelsExpandDepth: -1 to hide models by default
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
        // This helps prevent errors if SwaggerUI modifies the DOM in ways React doesn't expect
        swaggerUIRoot.current.innerHTML = '';
      }
    };
  }, []); // Empty dependency array ensures this runs once on mount and cleans up on unmount

  return <div id="swagger-ui-container" ref={swaggerUIRoot}></div>;
};


export default function ApiDocsPage() {
  return (
    <div className="space-y-6">
      <Head>
        <link
          rel="stylesheet"
          type="text/css"
          href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"
          key="swagger-css"
        />
        <title>API Reference | 5satoshi Dashboard</title>
      </Head>
      <PageTitle
        title="API Reference"
        description="Explore the available API endpoints for the Lightning Stats Dashboard."
      />
      <div className="bg-card p-4 sm:p-6 rounded-lg shadow">
        <SwaggerUIInitializer />
      </div>
    </div>
  );
}
