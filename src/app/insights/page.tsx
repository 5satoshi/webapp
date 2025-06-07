import { PageTitle } from '@/components/ui/page-title';
import { InsightsGenerator } from '@/components/dashboard/insights/insights-generator';
import { mockAiInput } from '@/lib/mock-data';

export default function InsightsPage() {
  return (
    <div className="space-y-6">
      <PageTitle 
        title="AI-Powered Insights" 
        description="Get custom tailored recommendations to optimize your node's performance and profitability." 
      />
      <InsightsGenerator initialAiInput={mockAiInput} />
    </div>
  );
}
