
# Release Notes

This document tracks major feature additions and updates to the Lightning Stats Dashboard.

## Latest Update

### Channel Drain Metric & Analysis

- **New "Drain" Column**: A "Drain" column has been added to the **Channels** page table. This metric provides insight into the net liquidity flow of a channel based on its role in providing the cheapest routes for common-sized payments.
- **Calculation**: It is calculated as the cubic root of the difference between the outbound and inbound shortest path shares: `cbrt(out_share - in_share)`. This helps to normalize the values and make trends more visible.
- **Color Coding**:
    - **Positive values** are displayed in the primary color (purple), indicating a net outbound flow (the channel is "draining" away from your node).
    - **Negative values** are displayed in the secondary color (orange), indicating a net inbound flow (the channel is "refilling" your node).
- **Tooltip**: An info icon in the "Drain" column header provides a clear definition of the metric on hover.
- **Robustness**: The calculation now handles cases where only one side of the liquidity flow (inbound or outbound) has data, treating the missing value as zero. "N/A" is displayed if both values are missing.

---

## Core Features (Initial Release)

The dashboard was launched with a comprehensive set of features for Lightning Network node operators:

- **Node Overview**: An at-a-glance summary of key performance indicators, historical forwarding volume, and period-specific activity. Includes metrics like "Betweenness Rank" and "Shortest Path Share" fetched via the application's internal API.
- **Channel Management**: A detailed, sortable, and filterable list of all channels with their status, capacity, and balance. A detail view for each channel provides granular statistics on its history and performance.
- **Network Insights**: Analytics on routed payment amounts (distribution and value over time) and transaction timing patterns visualized as a heatmap.
- **Routing Analysis**: In-depth analysis of the node's position in the network graph.
    - **Shortest Path Share**: See how often your node is part of the cheapest path for micro, common, and macro payments.
    - **Top Node Comparison**: Compare your node's performance against the top nodes in the network for different payment sizes.
    - **Node-Specific Trends**: View historical shortest path share and rank for any node in the network.
- **AI-Powered Assistance**:
    - **Node ID/Alias Autocomplete**: Genkit-powered suggestions for node IDs and aliases when searching on the Routing Analysis page.
- **API Documentation Viewer**: An integrated Swagger UI to explore the application's local and production API specifications.
- **Responsive Design**: A modern, responsive interface built with Next.js, ShadCN UI, and Tailwind CSS, ensuring a consistent experience across devices.
