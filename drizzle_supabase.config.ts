import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

config({ path: '.dev.vars' }); // or .env.local

export default defineConfig({
  schema: './drizzle_supabase/db/schema',
  out: './drizzle_supabase/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.SUPABASE_DATABASE_AORPPOST_URL!,
  },
	// schemaFilter: ['public'],
});
