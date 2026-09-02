import { Hono } from 'hono';
import Type from 'typebox';
import type { GenericResponseInterface } from '../../../models/GenericResponseInterface';
import { tbValidator } from '@hono/typebox-validator';
import { eq, or, and, sql, desc } from 'drizzle-orm';
import { wallets, transactions, monthPeriods } from '../../../../drizzle_tind_tracking/db/schema';
import { createDbClient } from '../../../../drizzle_tind_tracking/db/dbClient';
import { getAuthenticatedUserInfo } from '../../../auth/getAuthenticatedUser';

export const updateWallet = new Hono<{ Bindings: Env }>();

const schema = Type.Object({
	id: Type.String(),
	name: Type.Optional(Type.String()),
	isDefault: Type.Optional(Type.Boolean()),
	isDelegated: Type.Optional(Type.Boolean()),
	isSaving: Type.Optional(Type.Boolean()),
	balance: Type.Optional(Type.Number()),
	monthPeriodId: Type.Optional(Type.String()),
})

updateWallet.put('/wallets', tbValidator('json', schema), async (c) => {
	try {
		const user = getAuthenticatedUserInfo(c);
		if (!user) {
			return c.json({ success: false, message: "Unauthorized", data: null } satisfies GenericResponseInterface, 401);
		}

		const { id, name, isDefault, isDelegated, isSaving, balance, monthPeriodId } = c.req.valid('json');

		const { db, client } = createDbClient(c.env);

		const [existing] = await db
			.select()
			.from(wallets)
			.where(eq(wallets.id, id))
			.limit(1);

		if (!existing) {
			client.close();
			return c.json({ success: false, message: "Wallet not found", data: null } satisfies GenericResponseInterface, 404);
		}
		if (existing.userId !== user.id) {
			client.close();
			return c.json({ success: false, message: "Wallet does not belong to you", data: null } satisfies GenericResponseInterface, 403);
		}

		if (balance !== undefined) {
			const [relatedTx] = await db
				.select({ id: transactions.id })
				.from(transactions)
				.where(or(
					eq(transactions.walletId, id),
					eq(transactions.toWalletId, id)
				))
				.limit(1);

			if (relatedTx) {
				client.close();
				return c.json({ success: false, message: "Cannot update balance: wallet is used in transactions", data: null } satisfies GenericResponseInterface, 400);
			}
		}

		const updateData: Record<string, any> = { updatedAt: new Date() };
		if (name !== undefined) {
			const trimmed = name.trim();
			if (!trimmed) {
				client.close();
				return c.json({ success: false, message: "Name is required", data: null } satisfies GenericResponseInterface, 400);
			}
			const [duplicate] = await db
				.select()
				.from(wallets)
				.where(and(
					sql`LOWER(${wallets.name}) = LOWER(${trimmed})`,
					eq(wallets.userId, user.id)
				))
				.limit(1);
			if (duplicate && duplicate.id !== id) {
				client.close();
				return c.json({ success: false, message: "Wallet with this name already exists", data: null } satisfies GenericResponseInterface, 400);
			}
			updateData.name = trimmed;
		}
		if (isDefault !== undefined) updateData.isDefault = isDefault;
		if (isDelegated !== undefined) updateData.isDelegated = isDelegated;
		if (isSaving !== undefined) updateData.isSaving = isSaving;
		if (balance !== undefined) updateData.balance = balance;
		if (monthPeriodId !== undefined) {
			let resolvedMonthPeriodId = monthPeriodId;
			if (resolvedMonthPeriodId) {
				const [period] = await db
					.select()
					.from(monthPeriods)
					.where(and(
						eq(monthPeriods.id, resolvedMonthPeriodId),
						eq(monthPeriods.userId, user.id)
					))
					.limit(1);
				if (!period) {
					client.close();
					return c.json({ success: false, message: "Month period not found", data: null } satisfies GenericResponseInterface, 404);
				}
			}
			updateData.monthPeriodId = resolvedMonthPeriodId;
		}

		await db.update(wallets)
			.set(updateData)
			.where(eq(wallets.id, id))
			.run();

		const [updated] = await db
			.select()
			.from(wallets)
			.where(eq(wallets.id, id))
			.limit(1);

		client.close();

		return c.json({
			success: true,
			message: "Wallet updated successfully",
			data: updated,
		} satisfies GenericResponseInterface, 200);
	} catch (error: any) {
		return c.json({
			success: false,
			message: error
				? `Error while updating wallet: ${error}${error.code ? ` - ${error.code}` : ''}`
				: 'Error while updating wallet',
			data: null,
		} satisfies GenericResponseInterface, 500);
	}
});
