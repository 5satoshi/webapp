
# Lightning Stats Dashboard

The Lightning Stats Dashboard is a comprehensive web application designed for Lightning Network node operators. It provides detailed insights into node performance, network activity, and channel management, leveraging AI-powered analytics to offer tailored recommendations.

## Core Features

The dashboard offers a suite of features to monitor and analyze your Lightning Network node:

- **Node Overview**: At-a-glance summary of key performance indicators, historical forwarding volume, period-specific activity, and information about the node.
- **Channel Management**: Detailed listing of all channels with status, capacity, balance, and performance metrics, including a detail view for individual channels.
- **Network Insights**: Analytics on routed payment amounts (distribution and value over time) and transaction timing patterns (heatmap).
- **Routing Analysis**: Insights into the node's role in the network's cheapest paths for various payment sizes (shortest path share), including comparisons with top nodes and historical trends for any selected node.
- **AI-Powered Assistance**: Includes features like Node ID/Alias autocomplete with rank information to aid in analysis.

For more detailed information on each section, please refer to our [Documentation](#documentation).

## Documentation

For detailed information about installing, configuring, and using the Lightning Stats Dashboard, please refer to the following documents:

- **[Installation Guide](./docs/installation.md)**: Instructions for setting up and running the application.
- **[Overview Page Guide](./docs/overview.md)**: Detailed explanation of the Node Overview page.
- **[Channels Page Guide](./docs/channels.md)**: Detailed explanation of the Channels page and features.
- **[Network Insights Guide](./docs/network-insights.md)**: Detailed explanation of the Network Insights (Analytics) page.
- **[Routing Analysis Guide](./docs/routing-analysis.md)**: Detailed explanation of the Routing Analysis (Subsumption) page.

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
    -   `overviewService.ts`, `channelsService.ts`, `analyticsService.ts`, `subsumptionService.ts`: Fetch data from BigQuery for different dashboard sections.
-   `src/lib/`: Utility functions, type definitions, constants, and mock data.
    -   `bigqueryUtils.ts`: Utilities for BigQuery data formatting and date ranges.
    -   `types.ts`: TypeScript type definitions for data structures.
    -   `constants.ts`: Application-wide constants.
-   `src/ai/`: Genkit AI related code.
    -   `genkit.ts`: Genkit global configuration.
    -   `flows/`: Genkit flows for AI-powered features (e.g., `getNodeSuggestionsFlow.ts`).
-   `public/`: Static assets.
-   `src/app/globals.css`: Global styles and Tailwind CSS theme configuration (ShadCN).
-   `docs/`: Contains detailed documentation files.

## AI Features

The application integrates AI capabilities using Genkit:

-   **Node ID/Alias Autocomplete**: Provides suggestions for node IDs and aliases when searching/filtering, including their latest common rank from BigQuery. This is used in the Routing Analysis page.

These features are implemented as Genkit flows, which can be found in `src/ai/flows/`.

## Data Source

All statistical data for the dashboard is sourced from Google BigQuery. The queries are defined within the service files in `src/services/`. The `ensureBigQueryClientInitialized` function in `src/services/bigqueryClient.ts` manages the connection.

## Styling

-   The application uses **Tailwind CSS** for utility-first styling.
-   **ShadCN UI** provides the base components.
-   The color scheme and theme variables (CSS HSL) are defined in `src/app/globals.css`, adhering to the project's style guidelines (Deep Purple primary, Burnt Orange secondary, Dark Gray background).
-   Fonts: 'Inter' for body text, 'Space Grotesk' for headlines.

