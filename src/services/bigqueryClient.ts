
import { BigQuery } from '@google-cloud/bigquery';

export const projectId = process.env.BIGQUERY_PROJECT_ID || 'lightning-fee-optimizer';
export const datasetId = process.env.BIGQUERY_DATASET_ID || 'version_1';

let bigqueryInstance: BigQuery | undefined;
let bigqueryInitializationError: Error | null = null;
let bigqueryPromise: Promise<void> | null = null;

async function initializeBigQuery(): Promise<void> {
  if (bigqueryInstance) {
    // console.log("BigQuery client already initialized.");
    return;
  }
  if (bigqueryInitializationError) {
    // console.warn("BigQuery client initialization previously failed. Not re-attempting.");
    return;
  }

  // console.log("Attempting to initialize BigQuery client...");
  try {
    // console.log(`Initializing BigQuery client with projectId: ${projectId}`);
    const client = new BigQuery({ projectId });
    
    // console.log("BigQuery client instantiated. Attempting to get and log authentication details...");
    try {
      const credentials = await client.authClient.getCredentials(); 
      // console.log("Successfully called getCredentials() on authClient.");

      if (credentials && typeof credentials === 'object') {
        if ('client_email' in credentials && typeof credentials.client_email === 'string' && credentials.client_email) {
          // console.log(`BigQuery client is authenticated as service account: ${credentials.client_email}`);
        } else if ('refresh_token' in credentials && credentials.refresh_token) {
           // console.log("BigQuery client is authenticated using user refresh token (likely OAuth flow).");
        } else if (Object.keys(credentials).length === 0) {
           // console.log("BigQuery client credentials object is empty. This might indicate it's using gcloud CLI default credentials or environment-provided ADC without explicit email (e.g., on App Hosting or GCE).");
        } else {
          // console.log("BigQuery client authenticated, but credentials object is not in a recognized service account or user refresh token format. Keys:", Object.keys(credentials).join(', '));
        }
      } else if (credentials === null || credentials === undefined) {
         // console.log("BigQuery client getCredentials() returned null or undefined. Client might be using environment credentials transparently (e.g., on App Hosting or GCE).");
      } else {
        // console.log("BigQuery client authenticated, but credentials object is not in a recognized format:", credentials);
      }
    } catch (authError: any) {
      // console.error("Error calling bigquery.authClient.getCredentials():", authError.message);
      if (authError.message && authError.message.includes("Could not load the default credentials")) {
        // console.error("Hint for 'Could not load the default credentials': Ensure GOOGLE_APPLICATION_CREDENTIALS env var is set correctly for local dev, or that the runtime service account for App Hosting has permissions and BigQuery API is enabled.");
      }
    }
    
    bigqueryInstance = client;
    // console.log("BigQuery client assigned to bigqueryInstance successfully.");
    bigqueryInitializationError = null; 

  } catch (error: any) {
    console.error(`BigQuery client main initialization error:`, error.message);
    if (error.code) {
      console.error(`Error Code: ${error.code}`);
    }
    if (error.errors) {
      console.error('Detailed Errors:', JSON.stringify(error.errors, null, 2));
    }
    bigqueryInitializationError = error; 
    bigqueryInstance = undefined; 
  }
}

if (typeof window === 'undefined') { 
  bigqueryPromise = initializeBigQuery();
}


export function getBigQueryClient(): BigQuery | undefined {
  if (bigqueryInitializationError) {
    return undefined;
  }
  return bigqueryInstance;
}

export async function ensureBigQueryClientInitialized(): Promise<void> {
    if (!bigqueryPromise) {
        if (typeof window === 'undefined') {
          bigqueryPromise = initializeBigQuery();
        } else {
          console.error("ensureBigQueryClientInitialized called in a client-side context. BigQuery operations should be server-side.");
          throw new Error("BigQuery client cannot be initialized client-side.");
        }
    }
    try {
        await bigqueryPromise;
        if (bigqueryInitializationError) {
            console.error("ensureBigQueryClientInitialized: Initialization failed.", bigqueryInitializationError.message);
            throw bigqueryInitializationError; 
        }
         if (!bigqueryInstance) {
            console.error("ensureBigQueryClientInitialized: BigQuery instance is still not available after awaiting promise, and no explicit error was set. This is unexpected.");
            throw new Error("BigQuery client not available after initialization.");
        }
    } catch (error) {
        console.error("ensureBigQueryClientInitialized: Error during await of bigqueryPromise.", error);
        throw error;
    }
}
