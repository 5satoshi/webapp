
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
  // If there was a previous error, and we are re-attempting, clear it.
  // However, ensureBigQueryClientInitialized should prevent re-attempts if an error is sticky.
  // bigqueryInitializationError = null; 

  // console.log("Attempting to initialize BigQuery client...");
  try {
    // console.log(`Initializing BigQuery client with projectId: ${projectId}`);
    const client = new BigQuery({ projectId });
    
    // console.log("BigQuery client instantiated. Attempting to get and log authentication details...");
    // Optional: Perform a lightweight operation to confirm connectivity/auth, e.g., client.getServiceAccount()
    // For now, we assume constructor success means basic setup is okay, errors usually surface on first query.
    // await client.getProjects(); // Example check, but adds overhead.

    bigqueryInstance = client;
    // console.log("BigQuery client assigned to bigqueryInstance successfully.");
    bigqueryInitializationError = null; // Clear any previous error on successful init

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
    // Re-throw the error so the promise awaiting this initialization fails
    throw error;
  }
}

// Initialize on module load for server environments
if (typeof window === 'undefined') { 
  bigqueryPromise = initializeBigQuery().catch(err => {
    // The promise itself will be rejected, but we've already set bigqueryInitializationError.
    // This catch is to prevent unhandled promise rejection at the module level if not awaited elsewhere.
    // console.error("BigQuery initialization promise rejected at module level:", err.message);
  });
}


export function getBigQueryClient(): BigQuery | undefined {
  if (bigqueryInitializationError) {
    // console.warn("getBigQueryClient: Returning undefined due to prior initialization error.");
    return undefined;
  }
  return bigqueryInstance;
}

export async function ensureBigQueryClientInitialized(): Promise<void> {
    if (bigqueryInitializationError) {
      // console.error("ensureBigQueryClientInitialized: Short-circuiting due to existing initialization error.", bigqueryInitializationError.message);
      throw bigqueryInitializationError;
    }
    
    if (!bigqueryPromise) {
        if (typeof window === 'undefined') {
          // This case should ideally not be hit if module-level init is working,
          // but as a fallback:
          // console.warn("ensureBigQueryClientInitialized: bigqueryPromise was null, attempting re-initialization.");
          bigqueryPromise = initializeBigQuery().catch(err => {
            // console.error("BigQuery re-initialization promise rejected:", err.message);
          });
        } else {
          const clientSideError = new Error("BigQuery client cannot be initialized client-side.");
          console.error("ensureBigQueryClientInitialized called in a client-side context.", clientSideError.message);
          bigqueryInitializationError = clientSideError;
          throw clientSideError;
        }
    }

    try {
        await bigqueryPromise;
        // After promise resolves, check again for an error set during initialization
        if (bigqueryInitializationError) {
            // console.error("ensureBigQueryClientInitialized: Initialization failed during promise execution.", bigqueryInitializationError.message);
            throw bigqueryInitializationError; 
        }
         if (!bigqueryInstance) {
            const noInstanceError = new Error("BigQuery client not available after initialization and no specific error was thrown.");
            // console.error("ensureBigQueryClientInitialized: BigQuery instance is still not available after awaiting promise.", noInstanceError.message);
            bigqueryInitializationError = noInstanceError; // Set error for future calls
            throw noInstanceError;
        }
        // console.log("ensureBigQueryClientInitialized: BigQuery client is ready.");
    } catch (error: any) {
        // console.error("ensureBigQueryClientInitialized: Error during await of bigqueryPromise or subsequent checks.", error.message);
        if (!bigqueryInitializationError) { // Ensure error is stored if not already
            bigqueryInitializationError = error;
        }
        throw error; // Re-throw to be caught by service functions
    }
}

