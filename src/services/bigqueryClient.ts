
import { BigQuery } from '@google-cloud/bigquery';

export const projectId = process.env.BIGQUERY_PROJECT_ID || 'lightning-fee-optimizer';
export const datasetId = process.env.BIGQUERY_DATASET_ID || 'version_1';

let bigqueryInstance: BigQuery | undefined;
let bigqueryInitializationError: Error | null = null;
let bigqueryPromise: Promise<void> | null = null;

async function initializeBigQuery(): Promise<void> {
  if (bigqueryInstance) {
    console.log("BigQuery client already initialized.");
    return;
  }
  if (bigqueryInitializationError) {
    console.warn("BigQuery client initialization previously failed. Not re-attempting until error is cleared or app restarts.");
    return;
  }

  try {
    console.log(`Attempting to initialize BigQuery client with projectId: ${projectId}`);
    const client = new BigQuery({ projectId });
    
    console.log("BigQuery client instantiated. Attempting to get credentials to verify auth...");
    try {
      const credentials = await client.auth.getCredentials();
      console.log("Successfully retrieved credentials object from BigQuery client.");

      if (credentials && typeof credentials === 'object') {
        if ('client_email' in credentials && typeof credentials.client_email === 'string' && credentials.client_email) {
          console.log(`BigQuery client is authenticated as service account: ${credentials.client_email}`);
        } else if ('refresh_token' in credentials && credentials.refresh_token) {
           console.log("BigQuery client is authenticated using user refresh token (likely OAuth flow).");
        } else if (Object.keys(credentials).length === 0) {
           console.log("BigQuery client credentials object is empty. This might indicate it's using gcloud CLI default credentials or environment-provided ADC without explicit email (e.g., on App Hosting).");
        }
         else {
          console.log("BigQuery client authenticated with non-standard credentials object structure. Keys:", Object.keys(credentials).join(', '));
        }
      } else if (credentials === null || credentials === undefined) {
         console.log("BigQuery client getCredentials() returned null or undefined. Client might be using environment credentials transparently (e.g., on App Hosting or GCE).");
      }
       else {
        console.log("BigQuery client authenticated, but credentials object is not in a recognized format:", credentials);
      }
    } catch (authError: any) {
      console.error("Error calling bigquery.auth.getCredentials():", authError.message);
      if (authError.message && authError.message.includes("Could not load the default credentials")) {
        console.error("Hint for 'Could not load the default credentials': Ensure GOOGLE_APPLICATION_CREDENTIALS env var is set correctly for local dev, or that the runtime service account for App Hosting has permissions and BigQuery API is enabled.");
      }
    }
    
    bigqueryInstance = client;
    console.log("BigQuery client initialized successfully and assigned to bigqueryInstance.");

  } catch (error: any) {
    bigqueryInitializationError = error;
    // Use a generic logger or the bigqueryUtils logger if it's safe to import here
    console.error(`BigQuery Error in bigqueryClient.ts (main initialization):`, error.message);
    if (error.code) {
      console.error(`Error Code: ${error.code}`);
    }
    if (error.errors) {
      console.error('Detailed Errors:', JSON.stringify(error.errors, null, 2));
    }
  }
}

// Initialize on module load
bigqueryPromise = initializeBigQuery();


export function getBigQueryClient(): BigQuery | undefined {
  if (bigqueryInitializationError) {
    // console.error("Returning undefined for BigQuery client due to prior initialization error.");
    return undefined;
  }
  return bigqueryInstance;
}

export async function ensureBigQueryClientInitialized(): Promise<void> {
    if (!bigqueryPromise) {
        // This case should ideally not happen if bigqueryPromise is set at module scope.
        // But as a fallback, re-initiate.
        console.warn("bigqueryPromise was null, re-initiating initialization.");
        bigqueryPromise = initializeBigQuery();
    }
    await bigqueryPromise;
}
