import { Hono } from 'hono';
import { cors } from 'hono/cors';
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
	const env = c.env.ENVIRONMENT || 'unknown';
	return c.json({
		message: 'Hello from tindapi!',
		environment: env,
		SECRET_API_KEY: c.env.SECRET_API_KEY
	});
});

export default app;
