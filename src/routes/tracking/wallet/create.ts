import { Hono } from 'hono';
import Type from 'typebox';
import type { GenericResponseInterface } from '../../../models/GenericResponseInterface';
import { tbValidator } from '@hono/typebox-validator';
import { eq, and, sql } from 'drizzle-orm';
import { ulid } from 'ulid';
import { wallets } from '../../../../drizzle_tind_tracking/db/schema';
import { createDbClient } from '../../../../drizzle_tind_tracking/db/dbClient';
import { getAuthenticatedUserInfo } from '../../../auth/getAuthenticatedUser';

export const createWallet = new Hono<{ Bindings: Env }>();

const schema = Type.Object({
	name: Type.String(),
	isDefault: Type.Optional(Type.Boolean()),
	isDelegated: Type.Optional(Type.Boolean()),
	isSaving: Type.Optional(Type.Boolean()),
	balance: Type.Optional(Type.Number()),
})

createWallet.post('/wallets', tbValidator('json', schema), async (c) => {
	try {
		const user = getAuthenticatedUserInfo(c);
		if (!user) {
			return c.json({ success: false, message: "Unauthorized", data: null } satisfies GenericResponseInterface, 401);
		}

		const { name, isDefault, isDelegated, isSaving, balance } = c.req.valid('json');

		if (!name.trim()) {
			return c.json({ success: false, message: "Name is required", data: null } satisfies GenericResponseInterface, 400);
		}

		const { db, client } = createDbClient(c.env);

		const trimmedName = name.trim();
		const [duplicate] = await db
			.select()
			.from(wallets)
			.where(and(
				sql`LOWER(${wallets.name}) = LOWER(${trimmedName})`,
				eq(wallets.userId, user.id)
			))
			.limit(1);

		if (duplicate) {
			client.close();
			return c.json({ success: false, message: "Wallet with this name already exists", data: null } satisfies GenericResponseInterface, 400);
		}

		const id = ulid();
		const walletData = {
			id,
			userId: user.id,
			name: trimmedName,
			isDefault: isDefault ?? false,
			isDelegated: isDelegated ?? false,
			isSaving: isSaving ?? false,
			balance: balance ?? 0,
		};

		await db.insert(wallets).values(walletData).run();

		const [created] = await db
			.select()
			.from(wallets)
			.where(eq(wallets.id, id))
			.limit(1);

		client.close();

		return c.json({
			success: true,
			message: "Wallet created successfully",
			data: created,
		} satisfies GenericResponseInterface, 201);
	} catch (error: any) {
		return c.json({
			success: false,
			message: error
				? `Error while creating wallet: ${error}${error.code ? ` - ${error.code}` : ''}`
				: 'Error while creating wallet',
			data: null,
		} satisfies GenericResponseInterface, 500);
	}
});
