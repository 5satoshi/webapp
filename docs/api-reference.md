# API Reference

This page provides interactive documentation for the Lightning Stats Dashboard API.
You can explore the available endpoints, parameters, and responses.

<link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>
  window.onload = function() {
    SwaggerUIBundle({
      url: "/api/openapi.yaml", // Path to your OpenAPI spec in the public directory
      dom_id: '#swagger-ui',
      presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIBundle.SwaggerUIStandalonePreset
      ],
      layout: "StandaloneLayout",
      deepLinking: true, // Optional: enables deep linking to tags and operations
      // You can add more Swagger UI options here if needed
      // e.g., defaultModelsExpandDepth: -1 to hide models by default
    });
  };
</script>
