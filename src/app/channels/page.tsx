import { PageTitle } from '@/components/ui/page-title';
import { ChannelListTable } from '@/components/dashboard/channels/channel-list-table';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { fetchChannels } from '@/services/nodeService';

export default async function ChannelsPage() {
  const channels = await fetchChannels();

  return (
    <div className="space-y-6">
      <PageTitle title="Channel Management" description="Monitor and manage your Lightning Network channels.">
        <Button className="bg-cta-orange hover:bg-cta-orange/90 text-primary-foreground">
          <PlusCircle className="mr-2 h-4 w-4" /> Open New Channel
        </Button>
      </PageTitle>
      <ChannelListTable channels={channels} />
    </div>
  );
}
