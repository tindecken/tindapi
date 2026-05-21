import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseStorageClient: SupabaseClient | null = null;

/**
 * Returns a singleton Supabase client configured for storage operations.
 * Uses the service role key for server-side uploads.
 */
export function getSupabaseStorageClient(env: Env): SupabaseClient {
  if (!supabaseStorageClient) {
    supabaseStorageClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });
  }
  return supabaseStorageClient;
}
