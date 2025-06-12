
import { config } from 'dotenv';
config();

// import '@/ai/flows/generate-node-recommendations.ts'; // Removed
// import '@/ai/flows/summarize-recent-activity-flow.ts'; // This line will be removed
import '@/ai/flows/getNodeSuggestionsFlow.ts';
