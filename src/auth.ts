import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "../drizzle_tind_tracking/db/schema";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let authInstance: any = null;

export function getAuth(env: Env) {
  if (authInstance) return authInstance;

  const client = createClient({
    url: env.TURSO_DATABASE_URL,
    authToken: env.TURSO_AUTH_TOKEN,
  });
  const db = drizzle(client, { schema });

  authInstance = betterAuth({
    appName: "TindAPI",
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    basePath: "/tind_tracking/auth",
    database: drizzleAdapter(db, {
      provider: "sqlite",
    }),
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    plugins: [bearer()],
    trustedOrigins: [
      "http://localhost:8787",
      "http://localhost:5173",
      "http://localhost:3000",
      "https://d.tindecken.com",
    ],
  });

  return authInstance;
}
