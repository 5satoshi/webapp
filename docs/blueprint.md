# **App Name**: Lightning Stats Dashboard

## Core Features:

- Key Metrics Display: Display overall lightning node statistics such as total payments processed, forwarding fees earned, node uptime, and number of channels.
- Historical Trend Visualizations: Present historical trends via interactive charts and graphs, making it easy to visualize the node's performance over time. Enable users to toggle and focus the timescale to display different periods (days, weeks, months, years).
- AI-Powered Insights: AI-powered "Insights Generator" tool that analyzes the statistics to offer custom tailored recommendations for improvements such as suggested channel adjustments or fee optimization strategies.
- Channel Network Monitoring: Display all channel details, including peer node IDs, capacity, current balance, and historical payment success rates, which allows node operators to monitor and manage their channel network effectively.
- Custom Alerting System: Enable customizable alerts based on user-defined thresholds, notifying node operators of critical events or performance issues.
- Fee Distribution: Display a bar graph comparing remote vs. local channel fees (in ppm), highlighting the trend of remote channels with higher fees.
- Routing Activity: Display monthly routing count (last 12 months) and daily routing volume (last 6 weeks) using line or bar graphs with tooltips for precise values on hover.
- Payment Amount Distribution: Show frequency of different payment sizes via a histogram or bar chart, along with average value trends over time using a line graph.
- Network Subsumption Metrics: Display how often the node is the cheapest route for micro (200 sats), common (50,000 sats), and macro (4,000,000 sats) payments, using a line chart with time series trendlines and explanatory tooltip for "subsumption".
- Timing Patterns Heatmap: Present a weekly heatmap (7 days × 24 hours) showing when routing requests occur, using dark/light contrast to represent intensity of traffic, based on 8 weeks of data.

## Style Guidelines:

- Primary color: Deep purple (#673AB7) to reflect the forward-thinking nature of lightning network technology.
- Secondary color: Burnt orange (#FF7043) to complement the purple and add warmth.
- Background color: Dark gray (#212121) for high contrast, ideal for dashboards.
- Accent color: Electric purple (#BA68C8) used to highlight important data points and interactive elements, with orange (#FF9800) for call-to-actions.
- Body font: 'Inter' sans-serif for clean readability. Headline font: 'Space Grotesk' sans-serif, suitable for headlines and short amounts of body text; if longer text is anticipated, use 'Inter' for body.
- Use a set of modern, minimalist vector icons for all primary functions.
- Responsive design with clear grid layout, ensuring compatibility across desktop and mobile devices.
- Subtle transitions and loading animations to provide feedback and enhance the user experience.