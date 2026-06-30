import { Hono } from 'hono';
import Type from 'typebox';
import type { GenericResponseInterface } from '../../../models/GenericResponseInterface';
import { tbValidator } from '@hono/typebox-validator';
import { eq, or } from 'drizzle-orm';
import { wallets, transactions } from '../../../../drizzle_tind_tracking/db/schema';
import { createDbClient } from '../../../../drizzle_tind_tracking/db/dbClient';
import { getAuthenticatedUserInfo } from '../../../auth/getAuthenticatedUser';

export const deleteWallet = new Hono<{ Bindings: Env }>();

const schema = Type.Object({
	walletId: Type.String(),
})

deleteWallet.delete('/wallets', tbValidator('json', schema), async (c) => {
	try {
		const user = getAuthenticatedUserInfo(c);
		if (!user) {
			return c.json({ success: false, message: "Unauthorized", data: null } satisfies GenericResponseInterface, 401);
		}

		const { walletId } = c.req.valid('json');

		const { db, client } = createDbClient(c.env);

		const [existing] = await db
			.select()
			.from(wallets)
			.where(eq(wallets.id, walletId))
			.limit(1);

		if (!existing) {
			client.close();
			return c.json({ success: false, message: "Wallet not found", data: null } satisfies GenericResponseInterface, 404);
		}
		if (existing.userId !== user.id) {
			client.close();
			return c.json({ success: false, message: "Wallet does not belong to you", data: null } satisfies GenericResponseInterface, 403);
		}

		const [relatedTx] = await db
			.select({ id: transactions.id })
			.from(transactions)
			.where(or(
				eq(transactions.walletId, walletId),
				eq(transactions.toWalletId, walletId)
			))
			.limit(1);

		if (relatedTx) {
			client.close();
			return c.json({ success: false, message: "Cannot delete wallet: it is used in transactions", data: null } satisfies GenericResponseInterface, 400);
		}

		await db.delete(wallets)
			.where(eq(wallets.id, walletId))
			.run();

		client.close();

		return c.json({
			success: true,
			message: `Wallet "${existing.name}" deleted successfully`,
			data: null,
		} satisfies GenericResponseInterface, 200);
	} catch (error: any) {
		return c.json({
			success: false,
			message: error
				? `Error while deleting wallet: ${error}${error.code ? ` - ${error.code}` : ''}`
				: 'Error while deleting wallet',
			data: null,
		} satisfies GenericResponseInterface, 500);
	}
});
