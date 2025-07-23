
import { PageTitle } from '@/components/ui/page-title';
import { ChannelListTable } from '@/components/dashboard/channels/channel-list-table';
import { fetchChannels, fetchChannelDrains } from '@/services/channelsService'; // Updated import

export default async function ChannelsPage() {
  const channels = await fetchChannels();

  const shortChannelIds = channels
    .map(c => c.shortChannelId)
    .filter((id): id is string => id !== null && id !== undefined);

  if (shortChannelIds.length > 0) {
    const drainData = await fetchChannelDrains(shortChannelIds);
    channels.forEach(channel => {
      if (channel.shortChannelId && drainData[channel.shortChannelId]) {
        channel.drain = drainData[channel.shortChannelId].drain;
      }
    });
  }


  const pageDescription = `Re-balancing strategies can be expensive and time consuming, while the value for the network is limited. Especially loop-outs remove liquidity from the network, when the loop-out node is closing depleted channels. But also re-balance transactions from one channel to another of the same node do not improve the overall network capabilities. Instead, it moves liquidity to more expensive routes, which leads to a negative impact by higher fees for the lightning users.

With that said, we at 5satoshi follow a no-re-balancing policy. Each channel is left alone breathing with its own frequency. Fast depleting channels, that do not organically refill, we consider of no value, unless you can cover channel opening and closing cost with the fees earned by the depletion.`;

  return (
    <div className="space-y-6">
      <PageTitle title="Channels" description={pageDescription} />
      <ChannelListTable channels={channels} />
    </div>
  );
}
