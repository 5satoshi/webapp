
# Routing Analysis (Subsumption) Page Documentation

The **Routing Analysis Page** (labeled "Subsumption" in some contexts) focuses on understanding your node's position and performance within the broader Lightning Network by analyzing its "shortest path share." This metric indicates how often your node is part of the cheapest (shortest) route for payments of different sizes.

## Key Sections

### 1. Page Title & Description
- **Title**: "Routing Analysis"
- **Description**: Introduces the concept of analyzing the node's role in network routing, particularly through shortest path shares.

### 2. Top Nodes by Shortest Path Share Card
This section provides a competitive overview by ranking the top nodes in the network based on their latest shortest path share for different payment categories.

- **Description & Truncated Text**: Explains the "Shortest Path Share" concept as a ranking mechanism based on standard graph analytics (cheapest routes). The text can be expanded to read more.
- **Category Cards**: Three cards are typically displayed, one for each payment size category:
    - **Micro (200 sats)**
    - **Common (50k sats)**
    - **Macro (4M sats)**
- **Each Category Card Shows**:
    - **Title**: e.g., "Micro"
    - **Payment Size Label**: e.g., "(200 sats)"
    - **Table of Top Nodes**:
        - **#**: Rank within the top list for that category.
        - **Node**: Displays the node's alias (truncated) or a formatted Node ID.
        - **Share (Mobile Only)**: The shortest path share for that primary category.
        - **Tooltip (on Node Name)**: Hovering over the node name reveals a detailed tooltip:
            - Full Alias and Node ID.
            - Shortest path shares and ranks for *all three* categories (Micro, Common, Macro) for that specific node, allowing for a quick comparison of its performance across different payment sizes.

### 3. Node-Specific Routing Analysis Card
This section allows for a detailed analysis of a specific node's routing performance, defaulting to your own node but allowing analysis of any node.

- **Node Selector Form**:
    - **Input Field**: Allows users to enter a Node ID or an Alias to fetch data for. Autocomplete suggestions (node ID or alias with rank) appear as the user types.
    - **Button**: "Load Node Data" triggers the data fetch for the entered/selected node.
- **Selected Node's Shortest Path Share Over Time**:
    - **Title**: "[Selected Node's Display Name]'s Shortest Path Share Over Time"
    - **Aggregation Period Tabs**: Allows users to select the time frame for the historical data (Days, Weeks, Months, Quarters). This selection is persistent with the Node ID in the URL.
    - **Description**: Explains that the chart shows the historical trend of the selected node's shortest path share for micro, common, and macro payments.
    - **Network Subsumption Chart (Line Chart)**:
        - **X-axis**: Date, formatted according to the selected aggregation period.
        - **Y-axis**: Shortest Path Share (%).
        - **Lines**: Separate lines for:
            - **Micro (200 sats)**
            - **Common (50k sats)**
            - **Macro (4M sats)**
        - **Tooltip**: Hovering over data points shows the date and the share percentages for all three categories. The tooltip also includes an explanation of "Shortest Path Share."
    - **Explanatory Text**: Provides further context on interpreting the chart (higher percentage is better, fluctuations indicate network/fee changes).
- **Selected Node's Rank (Last [Period])**:
    - **Title**: "[Selected Node's Display Name]'s Rank (Last [Selected Period Label])"
    - **Description**: Explains that these cards show the selected node's current network rank for different payment sizes compared to the start of the selected period. Lower rank is better.
    - **Rank Cards (KeyMetricCard style)**: Three cards are displayed:
        - **Micro Rank**: Current rank for micro payments, with change from the start of the period.
        - **Common Rank**: Current rank for common payments, with change.
        - **Macro Rank**: Current rank for macro payments, with change.

### 4. About Shortest Path Share Card
- **Title**: "About Shortest Path Share"
- **Content**: Provides a more detailed explanation of how shortest path share is calculated and its significance in understanding a node's role in the network graph relative to routing fees and payment sizes.

## Data Interpretation
- **Top Nodes**: Understand who the major players are for different payment sizes and compare your node's ranking.
- **Node-Specific Chart**:
    - Track your node's (or any selected node's) performance over time for different payment types.
    - Identify if changes in your fee policy or network topology have impacted your shortest path share.
- **Node-Specific Ranks**: Quickly see your current standing and trend for micro, common, and macro payments.
- **Overall**: Use this page to assess how competitive your node's fee settings are and how well-positioned it is to attract routing flow for various payment amounts.
