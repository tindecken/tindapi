import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../migrations/schema';

console.log('process.env.SUPABASE_DATABASE_AORPPOST_URL!', process.env.SUPABASE_DATABASE_AORPPOST_URL!)

export function createDBClient() {
  const client = postgres(process.env.SUPABASE_DATABASE_AORPPOST_URL!, {
    prepare: false,          // Disable prepared statements (PgBouncer transaction mode incompatible)
    max: 1,                  // Single connection — best for serverless (Workers handle concurrency)
    idle_timeout: 20,        // Close idle connections after 20s (Supabase PgBouncer timeout: 300s)
    connect_timeout: 10,     // Fail fast if connection can't be established
    max_lifetime: 60 * 30,   // Max connection lifetime: 30 minutes
  });

  return drizzle(client, { schema });
}
