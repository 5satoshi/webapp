# Installation Guide

These instructions assume you have Node.js and npm/yarn installed.

## Prerequisites

- Access to a Google Cloud Project with BigQuery enabled.
- **BigQuery Data Requirements**: The application relies on specific tables in your BigQuery dataset, typically populated with data from your Core Lightning (CLN) or LND node. Ensure the following tables are present and contain the relevant data structures:
    -   **`peers`**: Contains information about your node's peers and channel states. This table is crucial for the "Channels" page (listing channels, their status, capacity, balance) and parts of the "Overview" page (e.g., connected peer count).
        -   Expected fields include: `id` (peer_node_id), `funding_txid`, `funding_outnum` (for unique channel ID), `short_channel_id`, `msatoshi_total` (channel capacity), `msatoshi_to_us` (local balance), `state` (e.g., `CHANNELD_NORMAL`), `alias.local` (peer alias), and optionally `state_changes` (an array of state transition objects with `timestamp` and `new_state`) for historical channel activity.
    -   **`forwardings`**: Stores details of forwarding events. This table is essential for most dashboard analytics, including forwarding volume, fees earned, payment success rates, timing patterns, and overall node statistics on the "Overview" and "Network Insights" pages. It also contributes to channel-specific history in the "Channels" page modal.
        -   Expected fields include: `received_time`, `resolved_time`, `status` (e.g., 'settled', 'local_failed'), `in_msat`, `out_msat`, `fee_msat`, `in_channel` (short_channel_id), `out_channel` (short_channel_id).
    -   **`nodes`**: Contains a list of known network nodes, including their `nodeid`, `alias`, and `last_timestamp` (last announcement). This table is used for the Node ID/Alias autocomplete feature on the "Routing Analysis" page.
        -   Expected fields include: `nodeid`, `alias`, `last_timestamp`.
    -   **`betweenness` (Accessed via API)**: While this table is crucial for network analysis features, the dashboard application itself does **not** directly query it. Instead, it accesses data derived from this table (such as betweenness centrality ranks, shortest path shares for nodes, and historical trends for these metrics) through its own internal API endpoints (e.g., `/api/betweenness/...`). The backend API routes are responsible for querying the `betweenness` table in BigQuery. This table is typically pre-calculated by analyzing the Lightning Network graph.
        -   Expected fields in the `betweenness` table (queried by the API) include: `nodeid`, `alias`, `timestamp`, `type` (e.g., 'micro', 'common', 'macro' for different payment sizes), `rank`, and `shortest_path_share`.
- Service Account credentials configured for local development if running outside a Google Cloud environment that provides Application Default Credentials (ADC).

## Environment Variables

The application uses environment variables for configuration:

-   **BigQuery Connection**:
    -   `BIGQUERY_PROJECT_ID`: Your Google Cloud Project ID (defaults to `lightning-fee-optimizer` if not set).
    -   `BIGQUERY_DATASET_ID`: Your BigQuery dataset ID (defaults to `version_1` if not set).
-   **API Endpoint Configuration**:
    -   `INTERNAL_API_HOST`: (Optional) The base URL for the application's internal API endpoints. If your deployment environment has a specific internal address for the service to call itself, set this variable. If not set, the application defaults to `siteConfig.apiBaseUrl` from `src/config/site.ts` (which is typically `https://5sats.com`), and then to `http://localhost:[PORT]` for local development.
-   **Local Development Credentials**:
    -   `GOOGLE_APPLICATION_CREDENTIALS`: Path to your service account key JSON file (e.g., `/path/to/your/service-account-key.json`). Required for local development if not using `gcloud auth application-default login`.

Create a `.env` file in the root of the project with these variables as needed:
```env
# .env (example)
BIGQUERY_PROJECT_ID=your-gcp-project-id
BIGQUERY_DATASET_ID=your_bigquery_dataset_id

# Optional: Override the API base URL for internal calls
# INTERNAL_API_HOST=https://your-app-internal-service-url.com

# For local development, if not using gcloud ADC:
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/service-account-key.json
```
Refer to `src/services/bigqueryClient.ts` for default BigQuery project/dataset IDs and `src/config/site.ts` for the default `apiBaseUrl`.

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
