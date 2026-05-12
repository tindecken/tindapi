import { Hono } from 'hono';
import { cors } from 'hono/cors';
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

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors({
  origin: ['http://tindecken.xyz', 'https://tindecken.xyz', 'http://localhost', 'https://localhost:1000', 'http://localhost:1000', 'http://localhost:3001', 'https://paperwork.tindecken.xyz', 'https://paperworkapi.tindecken.xyz', 'https://192.168.1.99:9090', 'http://192.168.1.99:9090', 'capacitor://192.168.1.99:9090', 'capacitor://192.168.1.99', 'https://192.168.1.3:9090', 'https://192.168.1.3:1000', 'https://10.10.0.27:1000', 'https://10.10.0.27:3001', 'http://localhost:9000', 'https://d.tindecken.xyz'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
  exposeHeaders: ['Content-Length', 'X-Kuma-Revision', 'X-Retry-After'],
  maxAge: 10 * 60
}))

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

export default app;
