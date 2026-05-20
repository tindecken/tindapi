import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';

config({ path: '.dev.vars' }); // or .env.local


export default defineConfig({
  schema: './drizzle/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
});
