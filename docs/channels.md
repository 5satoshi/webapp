
# Channels Page Documentation

The **Channels Page** provides a detailed view of all Lightning Network channels associated with your node. It allows for monitoring channel status, capacity, balance, and performance.

## Key Sections

### 1. Page Title & Description
- **Title**: "Channels"
- **Description**: Provides context on the importance of channel management and may include a brief statement on the node's re-balancing policy (e.g., 5satoshi's no-re-balancing policy).

### 2. Channel List Table
This is the primary component of the page, displaying a sortable and filterable list of all channels.

- **Filtering**: A search input allows users to filter the channel list by Peer Alias or Node ID.
- **Sorting**: Columns can be clicked to sort the channels in ascending or descending order. Sortable columns include:
    - Peer Alias / Node ID
    - Capacity (sats)
    - Balance (Local/Remote %)
    - Drain
    - Historical Payment Success Rate
    - Status
- **Columns Displayed**:
    - **Peer Alias / Node ID**: Displays the peer's alias if available, otherwise shows a truncated version of the peer's Node ID. Hovering (on desktop) shows the full Node ID if an alias is displayed.
    - **Capacity (sats)**: The total capacity of the channel in satoshis.
    - **Balance (Local/Remote %)**:
        - A progress bar visually represents the local balance percentage.
        - The text shows the local balance percentage (e.g., "60%").
        - Below, it shows the local and remote balance in satoshis (e.g., "600,000 / 400,000").
    - **Drain**: This value indicates the net liquidity flow for the channel regarding its role in the cheapest paths for common-sized payments. It is calculated as the cubic root of the difference between the outbound and inbound shortest path shares (`cbrt(out_share - in_share)`).
        - **Positive values** (in primary color, e.g., purple) indicate a net outbound flow, meaning the channel is "draining" liquidity away from your node.
        - **Negative values** (in secondary color, e.g., orange) indicate a net inbound flow, meaning the channel is "refilling" your node.
        - Hovering over the info icon in the header provides a definition.
    - **Historical Payment Success Rate**: The overall success rate of payments attempted through this channel (either inbound or outbound for the channel as a whole). This is based on forwarding history involving this channel.
    - **Status**: The current operational status of the channel (e.g., "active", "inactive", "pending"). Displayed as a badge with corresponding colors.

- **Row Interaction**: Clicking on any row in the table will open the **Channel Detail Modal** for that specific channel.

### 3. Channel Detail Modal
This modal appears when a channel row is clicked, providing more granular statistics for the selected channel.

- **Title**: "Channel Details: [Peer Display Name]"
- **Description**: "Detailed statistics for channel [Short Channel ID]."
- **Information Displayed**:
    - **First Transaction**: Timestamp of the first recorded transaction involving this channel.
    - **Last Transaction**: Timestamp of the most recent recorded transaction involving this channel.
    - **Total Successful Transactions**: Total count of successful transactions (inbound or outbound) that passed through this channel.
    - **Incoming Stats**:
        - **Successful Count**: Number of successful incoming forwards.
        - **Volume**: Total volume (in satoshis) of successful incoming forwards.
        - **Success Rate**: Success rate for incoming forwards (successful / total attempts).
    - **Outgoing Stats**:
        - **Successful Count**: Number of successful outgoing forwards.
        - **Volume**: Total volume (in satoshis) of successful outgoing forwards.
        - **Success Rate**: Success rate for outgoing forwards (successful / total attempts).
    - **Fees**:
        - **Total Fees Earned (via this channel)**: Total fees (in satoshis) earned by your node when this channel was the *outgoing* hop for a forwarded payment.
        - **Our Node's Advertised Policy**: The fee policy (base fee + proportional fee) your node advertises for routing payments *out* through this channel.

- **Actions**:
    - **Close Button**: Allows users to dismiss the modal.

## Data Interpretation
- **Balance**: Monitor local/remote balance to understand liquidity distribution. Channels heavily skewed one way might be less effective for routing in the opposite direction.
- **Drain**: Use this metric to understand the natural flow of liquidity. A high positive drain may require a fee adjustment to become less attractive for outbound payments, while a high negative drain might indicate an opportunity to lower fees to encourage more outbound flow.
- **Success Rate**: A low historical success rate for a channel might indicate issues with the peer or insufficient capacity/liquidity for typical payment sizes.
- **Status**: Keep an eye on channel statuses. "Inactive" or "pending" channels are not available for routing.
- **Modal Details**: Use the modal to diagnose issues with specific channels, understand their transaction history, and see if earned fees justify their existence if they are problematic.
