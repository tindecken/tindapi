import { google, sheets_v4 } from 'googleapis';
import { JWT } from 'google-auth-library';

/**
 * Works locally with process.env or in Workers with env bindings
 */
async function getAuthenticatedSheets(env?: Env): Promise<sheets_v4.Sheets> {
  // Use process.env for local dev, or pass an 'env' object for Workers
  const clientEmail = env?.GCP_SERVICE_ACCOUNT_EMAIL ?? process.env.GCP_SERVICE_ACCOUNT_EMAIL;
  let privateKey = env?.GCP_PRIVATE_KEY ?? process.env.GCP_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    throw new Error("Missing Google Service Account credentials in environment variables.");
  }

  const authClient = new JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({
    version: 'v4',
    auth: authClient
  });
}

export default getAuthenticatedSheets;

