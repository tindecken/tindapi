import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

console.log('process.env.SUPABASE_DATABASE_AORPPOST_URL!', process.env.SUPABASE_DATABASE_AORPPOST_URL!)

const client = postgres(process.env.SUPABASE_DATABASE_AORPPOST_URL!)

export const dbClient = drizzle(client);
