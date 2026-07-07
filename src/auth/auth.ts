import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bearer } from 'better-auth/plugins';
import { expo } from '@better-auth/expo';
import { ulid } from 'ulid';
import { createDbClient } from '../../drizzle_tind_tracking/db/dbClient';

let authInstance: any = null;

export function getAuth(env: Env) {
	if (authInstance) return authInstance;
	const { db } = createDbClient(env);
	authInstance = betterAuth({
		appName: 'TindAPI',
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		basePath: '/tind_tracking/auth',
		database: drizzleAdapter(db, {
			provider: 'sqlite',
		}),
		advanced: {
			database: {
				generateId: () => {
					return ulid();
				},
			},
			ipAddress: {
				ipAddressHeaders: ['x-forwarded-for', 'x-real-ip', 'cf-connecting-ip', 'true-client-ip'],
				disableIpTracking: false,
			},
			defaultCookieAttributes: {
				sameSite: 'none', // Allows cross-origin cookie sharing
				secure: true, // Requires HTTPS (turn off only in local HTTP dev)
				httpOnly: true,
			},
		},
		emailAndPassword: {
			enabled: true,
		},
		socialProviders: {
			google: {
				clientId: env.GOOGLE_CLIENT_ID,
				clientSecret: env.GOOGLE_CLIENT_SECRET,
			},
		},
		plugins: [bearer(), expo()],
		trustedOrigins: [
			'http://localhost:8787',
			'http://127.0.0.1:8787',
			'http://localhost:5173',
			'http://localhost:3000',
			'http://localhost:9000',
			'https://d.tindecken.com',
			'http://192.168.1.3:9000',
			'http://192.168.1.3:8787',
			'capacitor://192.168.1.3',
			'https://d2.tindecken.com',
		],
	});

	return authInstance;
}
