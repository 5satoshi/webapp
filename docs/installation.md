# Installation Guide

These instructions assume you have Node.js and npm/yarn installed.

## Prerequisites

- Access to a Google Cloud Project with BigQuery enabled.
- **Core Lightning (CLN) Node Data**: The application is designed to visualize and analyze data from your Core Lightning (CLN) node. You will need to export data from your CLN and ingest it into specific tables within your BigQuery dataset.
- Service Account credentials configured for local development if running outside a Google Cloud environment that provides Application Default Credentials (ADC).

### BigQuery Data Requirements

The dashboard relies on specific tables in your BigQuery dataset, populated with data from your CLN. You must set up a process to regularly export data from your CLN and load it into these BigQuery tables. The expected tables and their corresponding CLN data sources are:

1.  **`peers` Table**
    *   **CLN Data Source**: Primarily from `lightning-cli listpeers`. Channel-specific details like capacity and balance also align with `lightning-cli listchannels`.
    *   **Purpose**: Essential for the "Channels" page (listing channels, their status, capacity, balance) and parts of the "Overview" page (e.g., connected peer count).
    *   **Key Expected Fields**:
        *   `id` (string): The Node ID of the peer.
        *   `funding_txid` (string): Transaction ID of the funding output.
        *   `funding_outnum` (integer): Output number of the funding transaction. (Used with `funding_txid` for a unique channel identifier).
        *   `short_channel_id` (string): The short channel ID (e.g., "535050x927x0").
        *   `msatoshi_total` (integer): Total capacity of the channel in millisatoshis.
        *   `msatoshi_to_us` (integer): Your node's local balance in millisatoshis.
        *   `state` (string): The current operational state of the channel (e.g., `CHANNELD_NORMAL`, `OPENINGD`).
        *   `alias.local` (string, nullable): The peer's advertised alias. If not available, store as NULL or empty string.
        *   `state_changes` (array of objects, nullable): For historical channel activity, an array where each object has:
            *   `timestamp` (timestamp): Timestamp of the state change.
            *   `new_state` (string): The new state of the channel.

2.  **`nodes` Table**
    *   **CLN Data Source**: `lightning-cli listnodes`.
    *   **Purpose**: Used for Node ID/Alias autocomplete suggestions on the "Routing Analysis" page.
    *   **Key Expected Fields**:
        *   `nodeid` (string): The public key of the node.
        *   `alias` (string, nullable): The advertised alias of the node.
        *   `last_timestamp` (timestamp, nullable): The timestamp of the last announcement received from this node.

3.  **`forwardings` Table**
    *   **CLN Data Source**: `lightning-cli listforwards`.
    *   **Purpose**: Crucial for most dashboard analytics, including forwarding volume, fees earned, payment success rates, timing patterns, payment distributions, and overall node statistics on the "Overview" and "Network Insights" pages. Also contributes to channel-specific history in the "Channels" page modal.
    *   **Key Expected Fields**:
        *   `received_time` (timestamp): Timestamp when the payment HTLC was received.
        *   `resolved_time` (timestamp, nullable): Timestamp when the payment HTLC was resolved (settled or failed).
        *   `status` (string): The status of the forwarding attempt (e.g., 'settled', 'local_failed', 'failed').
        *   `in_msat` (integer): Amount in millisatoshis of the incoming HTLC.
        *   `out_msat` (integer, nullable): Amount in millisatoshis of the outgoing HTLC (if successful).
        *   `fee_msat` (integer, nullable): Fee earned in millisatoshis for this forward.
        *   `in_channel` (string, nullable): Short channel ID of the incoming channel.
        *   `out_channel` (string, nullable): Short channel ID of the outgoing channel.

4.  **`betweenness` Table (Data for Routing Analysis)**
    *   **Data Source**: This data is typically pre-calculated by analyzing the Lightning Network graph, often involving graph algorithms to determine betweenness centrality and shortest path shares. It's not directly from a single CLN command.
    *   **Purpose**: Powers network analysis features on the "Routing Analysis" page, such as node rankings, shortest path shares for different payment sizes, and historical trends for these metrics.
    *   **Access Method**:
        *   The dashboard application includes its own API endpoints (e.g., `/api/betweenness/...`) located in `src/app/api/betweenness/`. These server-side routes are responsible for querying a `betweenness` table in BigQuery.
        *   When a user runs their own instance of the dashboard, the client-side code (on pages like Routing Analysis) makes API calls to these endpoints.
        *   The target host for these API calls is determined by the `INTERNAL_API_HOST` environment variable.
        *   **If `INTERNAL_API_HOST` is set to the URL of the user's own deployed dashboard instance** (e.g., `https://their-dashboard.com`), then their dashboard's client-side calls its own backend API routes. These routes will then query the `betweenness` table configured in *their* BigQuery project (using `BIGQUERY_PROJECT_ID` and `BIGQUERY_DATASET_ID`). This is the recommended approach if the user has their own `betweenness` data.
        *   **If `INTERNAL_API_HOST` is NOT set**, it defaults to `siteConfig.apiBaseUrl` (from `src/config/site.ts`), which is `https://5sats.com`. In this scenario, the user's dashboard instance will make API calls to `https://5sats.com/api/...` for `betweenness` data. This means they will be using the **external 5satoshi API** for these specific statistics. This can be useful if they don't have their own `betweenness` data calculation process.
    *   **Key Expected Fields (in the BigQuery `betweenness` table queried by the API)**:
        *   `nodeid` (string): The Node ID.
        *   `alias` (string, nullable): The node's alias.
        *   `timestamp` (timestamp): Timestamp of the data record.
        *   `type` (string): Category of payment size (e.g., 'micro', 'common', 'macro').
        *   `rank` (integer, nullable): The node's rank for that type and timestamp.
        *   `shortest_path_share` (float, nullable): The node's shortest path share.

**After populating these tables in your BigQuery project, you must configure the dashboard application to connect to your project and dataset using the environment variables described below.**

## Environment Variables

The application uses environment variables for configuration:

-   **BigQuery Connection**:
    *   `BIGQUERY_PROJECT_ID`: Your Google Cloud Project ID (defaults to `lightning-fee-optimizer` if not set).
    *   `BIGQUERY_DATASET_ID`: Your BigQuery dataset ID (defaults to `version_1` if not set).
-   **API Endpoint Configuration**:
    *   `INTERNAL_API_HOST`: (Optional but Recommended for Production/Custom Setups) The base URL for the application's internal API endpoints (e.g., `https://your-app-service-url.com`).
        *   If you set this to your own application's URL, your dashboard will use its own backend API routes to query your BigQuery tables (including your `betweenness` table if populated).
        *   If this is not set, the application defaults to `siteConfig.apiBaseUrl` from `src/config/site.ts` (which is `https://5sats.com`). In this default case, or if you explicitly set `INTERNAL_API_HOST` to `https://5sats.com`, API calls for `betweenness` data will target the 5sats.com production API. Other API calls (if any were to exist that are not betweenness related) would still attempt to target the host defined by this logic.
-   **Local Development Credentials**:
    *   `GOOGLE_APPLICATION_CREDENTIALS`: Path to your service account key JSON file (e.g., `/path/to/your/service-account-key.json`). Required for local development if not using `gcloud auth application-default login`.

Create a `.env` file in the root of the project with these variables as needed:
```env
# .env (example)
BIGQUERY_PROJECT_ID=your-gcp-project-id
BIGQUERY_DATASET_ID=your_bigquery_dataset_id

# Optional: Set this to your application's own URL if you have your own betweenness data and want to use your instance's API.
# If not set, or set to https://5sats.com, betweenness data will be fetched from the 5sats.com API.
# INTERNAL_API_HOST=https://your-dashboard-deployment-url.com

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
This will typically start the application on `http://localhost:9002`. Your local instance will, by default, attempt to call `https://5sats.com/api/...` for betweenness data unless `INTERNAL_API_HOST` is set to `http://localhost:9002` (or your local dev URL) and you have a local `betweenness` table.

To run the Genkit development server (for testing AI flows):
```bash
npm run genkit:dev
# or for auto-reloading on changes
npm run genkit:watch
```
The Genkit server usually starts on `http://localhost:3100`.
