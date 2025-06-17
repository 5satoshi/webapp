# Overview Page Documentation

The **Overview Page** is the main landing page of the Lightning Stats Dashboard. It provides a high-level summary of your Lightning Network node's performance, key metrics, and historical activity.

## Key Sections

### 1. Page Title & Description
- **Title**: "Node Overview"
- **Description**: Welcomes users to the dashboard and briefly explains its purpose of offering transparency into the node's performance and operational strategy.

### 2. Key Metrics Cards (Overall)
This section displays several cards, each highlighting a crucial lifetime statistic of the node. These are calculated by querying the `forwardings` and `peers` tables in BigQuery:
- **Total Forwards Processed**: The total number of successful payment forwards handled by the node.
- **Forwarding Fees Earned**: The total amount of fees (in satoshis) earned from forwarding payments.
- **Total Forwarding Volume**: The total value (in BTC) of all successfully forwarded payments.
- **Connected Peers**: The current number of active peers connected to the node.

Each card shows the metric's title, its current value, an icon, and a brief unit or description.

### 3. Historical Forwarding Volume & Period Activity
This is a central card on the page that provides deeper insights into recent performance.

- **Aggregation Period Tabs**: Allows users to select the time frame for the displayed historical data and period-specific metrics. Options typically include "Days," "Weeks," "Months," and "Quarters." Selecting a different period re-fetches and updates the data in this section.
- **Historical Forwarding Volume Chart**:
    - Displays a composed chart showing forwarding volume (BTC as bars) and transaction count (as a line) over the selected period. Data is sourced from the `forwardings` table.
    - The X-axis represents time, formatted according to the selected aggregation period.
    - Hovering over data points reveals a tooltip with precise values for that interval.
- **Period Activity Cards**: Below the chart, this section displays metrics specific to the selected aggregation period, often with a comparison to the previous period.
    - **Betweenness Rank**: The node's current betweenness centrality rank for common payments. Shows the rank and the change compared to the start of the selected period. Lower rank is better. *This data is fetched via the application's internal API.*
    - **Shortest Path Share**: The expected fraction of routing attempts using this node for common payments over the selected period. Shows the current share and its absolute change (in percentage points) compared to the previous period. Higher is better. *This data is fetched via the application's internal API.*
    - **Local Success Rate**: The local forwarding success rate (successful forwards / (successful forwards + local fails)) in the selected period. Data is from the `forwardings` table. Shows the current rate and its absolute change (in percentage points) compared to the previous period. Higher is better.
    - **Channel Changes**: The number of channels opened versus closed in the selected period. Data is from the `peers` table (state changes).

### 4. About 5satoshi
- A section providing background information about the 5satoshi node, its operational history, mission, and routing philosophy.

### 5. External Platforms
- A grid of cards linking to the 5satoshi node's profile on various external Lightning Network explorer platforms like lightningnetwork.plus, Amboss.space, 1ml.com, and LN Router. Each card features the platform's logo and opens the link in a new tab.

## Data Interpretation
- **Trends**: Pay attention to trends in forwarding volume and success rate over time.
- **Rankings**: Monitor the Betweenness Rank and Shortest Path Share to understand the node's importance in the network. These are API-driven.
- **Local Success Rate**: A high local success rate is crucial for profitability and reliability. Decreases may indicate issues with channel liquidity or local policies.
- **Channel Activity**: Significant changes in opened/closed channels can impact routing capacity and network topology.
