
# Installation Guide

These instructions assume you have Node.js and npm/yarn installed.

## Prerequisites

- Access to a Google Cloud Project with BigQuery enabled.
- **BigQuery Data Requirements**: The application relies on specific tables in your BigQuery dataset, typically populated with data from your Core Lightning (CLN) node. Ensure the following tables are present and contain the relevant data structures:
    -   **`peers`**: Contains information about your node's peers and channel states, corresponding to data from the `listpeers` CLN command. This table is crucial for the "Channels" page and parts of the "Overview".
        -   Expected fields include: `id` (peer_node_id), `funding_txid`, `funding_outnum`, `short_channel_id`, `msatoshi_total` (channel capacity), `msatoshi_to_us` (local balance), `state` (e.g., `CHANNELD_NORMAL`), and optionally `state_changes` (an array of state transition objects with `timestamp` and `new_state`) for historical channel activity.
    -   **`forwardings`**: Stores details of forwarding events, corresponding to data from the `listforwards` CLN command. This table is essential for most dashboard analytics, including forwarding volume, fees earned, success rates, and timing patterns.
        -   Expected fields include: `received_time`, `resolved_time`, `status` (e.g., 'settled', 'local_failed'), `in_msat`, `out_msat`, `fee_msat`, `in_channel` (short_channel_id), `out_channel` (short_channel_id).
    -   **`betweenness`**: This table is expected to contain pre-calculated network metrics such as betweenness centrality ranks and shortest path shares for nodes, along with their aliases. This data is typically derived from analyzing the Lightning Network graph and is used for features like node suggestions (autocomplete), top node rankings in "Routing Analysis", and historical trend comparisons.
        -   Expected fields include: `nodeid`, `alias`, `timestamp`, `type` (e.g., 'micro', 'common', 'macro' for different payment sizes), `rank`, and `shortest_path_share`.
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
