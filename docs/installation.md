
# Installation Guide

These instructions assume you have Node.js and npm/yarn installed.

## Prerequisites

- Access to a Google Cloud Project with BigQuery enabled.
- The necessary data populated in your BigQuery tables (schema assumed by the application's service files).
- Service Account credentials configured for local development if running outside a Google Cloud environment that provides Application Default Credentials (ADC).

## Environment Variables

The application uses environment variables for configuration, primarily for connecting to BigQuery.
Create a `.env` file in the root of the project. The BigQuery `projectId` and `datasetId` are currently hardcoded in `src/services/bigqueryClient.ts` but can be overridden by environment variables:

```env
# .env (example)
BIGQUERY_PROJECT_ID=your-gcp-project-id
BIGQUERY_DATASET_ID=your_bigquery_dataset_id

# For local development, if not using gcloud ADC:
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/service-account-key.json
```

Refer to `src/services/bigqueryClient.ts` for default values if environment variables are not set.

## Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  Install dependencies:
    ```bash
    npm install
    # or
    yarn install
    ```

## Running the Development Server

To run the Next.js development server:

```bash
npm run dev
```

This will typically start the application on `http://localhost:9002`.

To run the Genkit development server (for testing AI flows):

```bash
npm run genkit:dev
# or for auto-reloading on changes
npm run genkit:watch
```
The Genkit server usually starts on `http://localhost:3100`.
