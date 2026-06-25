import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getAuth } from './auth/auth';
import { getAllTransactions } from "./routes/spreadsheet/getAllTransactions";
import { lastTransaction } from "./routes/spreadsheet/lastTransaction";
import { nhiRemaining } from "./routes/spreadsheet/nhiRemaining";
import { addTransaction } from "./routes/spreadsheet/addTransaction";
import { perDay } from "./routes/spreadsheet/perDay";
import { undoTransaction } from "./routes/spreadsheet/undoTransaction";
import { getMustPay } from "./routes/spreadsheet/getMustPay";
import { getHoangRemaining } from "./routes/spreadsheet/getHoangRemaining";
import { addTransactionForMustPay } from "./routes/spreadsheet/addTransactionForMustPay";
import { cashWithdrawal } from "./routes/spreadsheet/cashWithdrawal";
import { getNhiTransactions } from "./routes/spreadsheet/getNhiTransactions";
import { reconcilliation } from "./routes/spreadsheet/reconcilliation";
import { giveNhi } from "./routes/spreadsheet/giveNhi";
import { getCurrentAmounts } from "./routes/spreadsheet/getCurrentAmounts";
import { getEnvironmentVars } from "./routes/spreadsheet/getEnvironmentVars";
import { addLog } from "./routes/database/addLog";
import { getPostsBySecretName } from "./routes/supabase/getPostsBySecretName";
import { createPost } from "./routes/supabase/createPost";
import { testSupabase } from './routes/supabase/testSupabase';
import { transfer } from './routes/tracking/transaction/transfer';
import { createTransaction } from './routes/tracking/transaction/createStandard';
import { create as createMonthPeriod } from './routes/tracking/monthperiod/create';
import { get as getMonthPeriod } from './routes/tracking/monthperiod/get';
import { update as updateMonthPeriod } from './routes/tracking/monthperiod/update';
import { del as deleteMonthPeriod } from './routes/tracking/monthperiod/delete';
import { get as getCurrentMonthPeriod } from './routes/tracking/monthperiod/getCurrentMonthPeriod';
import { create as createRate } from './routes/tracking/rate/create';
import { get as getRates } from './routes/tracking/rate/get';
import { update as updateRate } from './routes/tracking/rate/update';
import { del as deleteRate } from './routes/tracking/rate/delete';
import { get as getLatestRate } from './routes/tracking/rate/getLatestRateOfCurrencyPair';

type Variables = {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
    createdAt: number;
    updatedAt: number;
  } | null;
  session: {
    id: string;
    userId: string;
    token: string;
    expiresAt: number;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: number;
    updatedAt: number;
  } | null;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use("*", cors({
  origin: (origin) => {
    const allowedOrigins = [
      'http://tindecken.com', 'https://tindecken.com',
      'https://paperwork.tindecken.com', 'https://paperworkapi.tindecken.com',
      'https://192.168.1.99:9090', 'http://192.168.1.99:9090',
      'capacitor://192.168.1.99:9090', 'capacitor://192.168.1.99',
      'https://192.168.1.3:9090', 'https://192.168.1.3:1000',
      'https://10.10.0.27:1000', 'https://10.10.0.27:3001',
      'https://d.tindecken.com', 'http://localhost:9000'
    ];
    if (!origin) return null;
    if (allowedOrigins.includes(origin)) return origin;
    // Allow any localhost with any port (http and https)
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return origin;
    return null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  exposeHeaders: ['Content-Length', 'X-Kuma-Revision', 'X-Retry-After'],
  maxAge: 10 * 60
}))

app.use("*", async (c, next) => {
  const path = c.req.path;
  if (path.startsWith("/tind_tracking/auth")) {
    await next();
    return;
  }
  const auth = getAuth(c.env);
  const session = await auth!.api.getSession({
    headers: c.req.raw.headers,
  });
  c.set("user", (session?.user ?? null) as any);
  c.set("session", (session?.session ?? null) as any);
  await next();
});

app.get("/tind_tracking/auth/sign-in/:provider", async (c) => {
  const provider = c.req.param("provider");
  const url = new URL(c.req.url);
  const baseURL = `${url.protocol}//${url.host}`;
  const callbackURL = `${baseURL}/tind_tracking/auth/callback/${provider}`;

  const res = await fetch(`${baseURL}/tind_tracking/auth/sign-in/social`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, callbackURL }),
  });

  const data = await res.json<{ url?: string }>();
  if (data.url) {
    const headers = new Headers();
    headers.set("Location", data.url);
    for (const [key, value] of res.headers) {
      if (key.toLowerCase() === "set-cookie") {
        headers.append("Set-Cookie", value);
      }
    }
    return new Response(null, { status: 302, headers });
  }
  return c.json(data, 500);
});

app.on(["POST", "GET"], "/tind_tracking/auth/*", async (c) => {
  const auth = getAuth(c.env);
  return auth!.handler(c.req.raw);
});

app.get('/', (c) => {
	return c.json({
		message: 'Hello from tindapi!',
		environment: c.env.ENVIRONMENT,
	});
});

app.route("/spreadsheet", addTransaction);
app.route("/spreadsheet", addTransactionForMustPay);
app.route("/spreadsheet", getAllTransactions);
app.route("/spreadsheet", lastTransaction);
app.route("/spreadsheet", nhiRemaining);
app.route("/spreadsheet", getHoangRemaining);
app.route("/spreadsheet", perDay);
app.route("/spreadsheet", undoTransaction);
app.route("/spreadsheet", getMustPay);
app.route("/spreadsheet", cashWithdrawal);
app.route("/spreadsheet", getNhiTransactions);
app.route("/spreadsheet", reconcilliation);
app.route("/spreadsheet", giveNhi);
app.route("/spreadsheet", getCurrentAmounts);
app.route("/spreadsheet", getEnvironmentVars);
app.route("/database", addLog);
app.route("/supabase", getPostsBySecretName);
app.route("/supabase", createPost);
app.route("/supabase", testSupabase);
app.route("/tind_tracking", transfer);
app.route("/tind_tracking", createTransaction);
app.route("/tind_tracking", createMonthPeriod);
app.route("/tind_tracking", getMonthPeriod);
app.route("/tind_tracking", updateMonthPeriod);
app.route("/tind_tracking", deleteMonthPeriod);
app.route("/tind_tracking", getCurrentMonthPeriod);
app.route("/tind_tracking", createRate);
app.route("/tind_tracking", getRates);
app.route("/tind_tracking", updateRate);
app.route("/tind_tracking", deleteRate);
app.route("/tind_tracking", getLatestRate);

export default app;
