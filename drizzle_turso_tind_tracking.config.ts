import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

config({ path: '.dev.vars' }); // or .env.local


export default defineConfig({
  schema: './drizzle_tind_tracking/db/schema.ts',
  out: './drizzle_tind_tracking/migrations',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
});
