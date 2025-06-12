
# Lightning Stats Dashboard

The Lightning Stats Dashboard is a comprehensive web application designed for Lightning Network node operators. It provides detailed insights into node performance, network activity, and channel management, leveraging AI-powered analytics to offer tailored recommendations.

## Core Features

- **Key Metrics Display**: Shows overall lightning node statistics such as total payments processed, forwarding fees earned, node uptime, and number of active channels.
- **Historical Trend Visualizations**: Presents historical trends via interactive charts for node performance over time, with selectable aggregation periods (days, weeks, months, quarters).
- **AI-Powered Insights**: Includes an AI-powered "Insights Generator" tool that analyzes statistics to offer custom recommendations (e.g., channel adjustments, fee optimization). *Currently, this involves summarizing recent activity and providing node ID/alias suggestions.*
- **Channel Network Monitoring**: Displays channel details, including peer node IDs, capacity, balance, and historical payment success rates.
- **Routing Analysis (Shortest Path Share)**: Analyzes how often the node is part of the cheapest route for micro, common, and macro payments, showing trends over time and ranking against other nodes.
- **Network Insights**: Provides analytics on payment amount distribution and transaction timing patterns using heatmaps.

## Technology Stack

- **Frontend**:
    - [Next.js](https://nextjs.org/) (App Router)
    - [React](https://reactjs.org/)
    - [TypeScript](https://www.typescriptlang.org/)
    - [ShadCN UI](https://ui.shadcn.com/) (Component Library)
    - [Tailwind CSS](https://tailwindcss.com/) (Styling)
    - [Recharts](https://recharts.org/) (Charting)
    - [Lucide React](https://lucide.dev/) (Icons)
- **Backend/AI**:
    - [Genkit (by Firebase)](https://firebase.google.com/docs/genkit) (AI integration, flows, and prompts)
    - Google AI (e.g., Gemini models for generative AI tasks)
- **Database**:
    - [Google BigQuery](https://cloud.google.com/bigquery) (Stores and serves all node and network statistics)
- **Deployment**:
    - Firebase App Hosting (Assumed target deployment platform)

## Getting Started

These instructions assume you have Node.js and npm/yarn installed.

### Prerequisites

- Access to a Google Cloud Project with BigQuery enabled.
- The necessary data populated in your BigQuery tables (schema assumed by `src/services/nodeService.ts` and `src/ai/flows/getNodeSuggestionsFlow.ts`).
- Service Account credentials configured for local development if running outside a Google Cloud environment that provides Application Default Credentials (ADC).

### Environment Variables

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

### Installation

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

### Running the Development Server

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

## Available Scripts

-   `npm run dev`: Starts the Next.js development server with Turbopack.
-   `npm run build`: Builds the application for production.
-   `npm run start`: Starts a Next.js production server (after building).
-   `npm run lint`: Lints the codebase using Next.js's built-in ESLint configuration.
-   `npm run typecheck`: Runs TypeScript to check for type errors.
-   `npm run genkit:dev`: Starts the Genkit development flow server.
-   `npm run genkit:watch`: Starts the Genkit development flow server with file watching.

## Project Structure

-   `src/app/`: Contains the Next.js App Router pages and layouts.
    -   `page.tsx`: Main overview page.
    -   `channels/`: Channel list and details.
    -   `analytics/`: Network insights (payment volume, timing).
    -   `subsumption/`: Routing analysis (shortest path share).
-   `src/components/`: Reusable UI components.
    -   `dashboard/`: Components specific to dashboard sections.
    -   `layout/`: Core layout components (AppShell, Sidebar, Header).
    -   `ui/`: ShadCN UI components.
-   `src/services/`: Contains services for data fetching and business logic.
    -   `bigqueryClient.ts`: Manages BigQuery client initialization and configuration.
    -   `nodeService.ts`: Fetches data from BigQuery for the dashboard.
-   `src/lib/`: Utility functions, type definitions, constants, and mock data.
    -   `bigqueryUtils.ts`: Utilities for BigQuery data formatting and date ranges.
    -   `types.ts`: TypeScript type definitions for data structures.
    -   `constants.ts`: Application-wide constants.
-   `src/ai/`: Genkit AI related code.
    -   `genkit.ts`: Genkit global configuration.
    -   `flows/`: Genkit flows for AI-powered features (e.g., `summarizeRecentActivityFlow.ts`, `getNodeSuggestionsFlow.ts`).
-   `public/`: Static assets.
-   `src/app/globals.css`: Global styles and Tailwind CSS theme configuration (ShadCN).

## AI Features

The application integrates AI capabilities using Genkit:

-   **Recent Activity Summarization**: Generates a natural language summary of node activity for a selected period.
-   **Node ID/Alias Autocomplete**: Provides suggestions for node IDs and aliases when searching/filtering, including their latest common rank from BigQuery.

These features are implemented as Genkit flows, which can be found in `src/ai/flows/`.

## Data Source

All statistical data for the dashboard is sourced from Google BigQuery. The queries are defined within the service files in `src/services/`. The `ensureBigQueryClientInitialized` function in `src/services/bigqueryClient.ts` manages the connection.

## Styling

-   The application uses **Tailwind CSS** for utility-first styling.
-   **ShadCN UI** provides the base components.
-   The color scheme and theme variables (CSS HSL) are defined in `src/app/globals.css`, adhering to the project's style guidelines (Deep Purple primary, Burnt Orange secondary, Dark Gray background).
-   Fonts: 'Inter' for body text, 'Space Grotesk' for headlines.

