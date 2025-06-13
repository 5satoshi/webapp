
# Network Insights (Analytics) Page Documentation

The **Network Insights Page** (labeled "Analytics" in the navigation) provides analytics about overall Lightning Network usage patterns as observed from your node's perspective. It helps understand how much and when the network is used by analyzing routed payment amounts and timing.

## Key Sections

### 1. Page Title & Description
- **Title**: "Network Insights"
- **Description**: Explains that this section aims to derive broader network usage insights from the node's local data.

### 2. Volume & Timing Analysis Card
This card contains the main visualizations for network insights.

- **Aggregation Period Tabs**: Allows users to select the time frame for the displayed data. Options typically include "Days," "Weeks," "Months," and "Quarters." The chart titles and descriptions update to reflect the selected period (e.g., "Last 7 Days", "Last 4 Weeks").

- **Payment Amount Chart Section**:
    - **Description**: Provides context on the importance of understanding routed payment amounts for the selected period.
    - **Forwarding Size Volume (Histogram)**:
        - **Chart Type**: Bar chart.
        - **Purpose**: Shows the distribution of payment amounts forwarded by the node.
        - **X-axis**: Payment amount ranges (e.g., "0-1k sats", "1k-10k sats"). The ranges adapt based on the selected aggregation period.
        - **Y-axis**: Frequency (count) of forwards within each amount range.
        - **Title**: "Forwarding Size Volume ([Selected Period Label])"
        - **Tooltip**: Shows the exact frequency for a hovered bar.
    - **Forwarding Value Over Time (Line Chart)**:
        - **Chart Type**: Line chart.
        - **Purpose**: Shows the evolution of median and maximum payment values over the selected period.
        - **X-axis**: Date/Time, aggregated according to the selected period.
        - **Y-axis**: Payment value in satoshis (logarithmic scale).
        - **Lines**:
            - **Median Value (sats)**: Represents the median value of successfully forwarded payments.
            - **Max Value (sats)**: Represents the maximum value of a successfully forwarded payment.
        - **Title**: "Forwarding Value Over Time"
        - **Tooltip**: Shows the median and max values for a hovered data point, along with the date.

- **Separator**: Visually divides the payment amount analysis from the timing pattern analysis.

- **Timing Patterns Heatmap Section**:
    - **Title**: "Timing Patterns Heatmap ([Selected Period Label])"
    - **Description**: Explains that the heatmap visualizes when transaction requests hit the node, aggregated over a week for the selected period, displayed in Coordinated Universal Time (UTC).
    - **Heatmap Visualization**:
        - **Layout**: A grid representing days of the week (Sunday to Saturday) and hours of the day (00:00 to 23:00 UTC). The layout adapts for mobile screens (hours as rows, days as columns).
        - **Color Intensity**: Cells are colored based on the intensity of routing requests. The color scheme differs for "Successful Forwards" and "Failed Forwards".
            - **Successful Forwards**: Typically uses shades of orange (from light/white for low activity to deep orange for high activity).
            - **Failed Forwards**: Typically uses shades of purple (from light/white for low activity to deep purple for high activity).
        - **Metric Selection Tabs**: Users can toggle between viewing "Successful Forwards" and "Failed Forwards" on the heatmap.
        - **Tooltip**: Hovering over a cell shows:
            - Day and hour range.
            - Number of successful forwards.
            - Number of failed forwards.
            - Total forwards.
            - Success rate for that specific hour and day of the week.
    - **Regional Indicators (Desktop View)**: Below the heatmap on wider screens, there might be indicators for general business hours in major regions (e.g., Asia, Europe, America) based on UTC time, providing context for activity peaks.

## Data Interpretation
- **Payment Amount Distribution**: Understand common payment sizes. This can inform fee strategies and channel capacity planning.
- **Value Over Time**: Track if the network is being used for larger or smaller payments over time.
- **Timing Heatmap**:
    - Identify peak traffic hours and days.
    - Correlate activity with global time zones or specific events.
    - Analyze patterns of successful vs. failed forwards to potentially identify periods of network congestion or local node issues.
