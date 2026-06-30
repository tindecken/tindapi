import { Hono } from 'hono';
import Type from 'typebox';
import type { GenericResponseInterface } from '../../../models/GenericResponseInterface';
import { tbValidator } from '@hono/typebox-validator';
import { eq, and } from 'drizzle-orm';
import {
	wallets,
	transactions,
	mustPayTransactions,
	transactionTypes,
} from '../../../../drizzle_tind_tracking/db/schema';
import { createDbClient } from '../../../../drizzle_tind_tracking/db/dbClient';
import { getAuthenticatedUserInfo } from '../../../auth/getAuthenticatedUser';

export const undoTransactions = new Hono<{ Bindings: Env }>();
const itemSchema = Type.Object({
	transactionId: Type.String(),
})
const schema = Type.Array(itemSchema)

undoTransactions.post('/transactions/undo', tbValidator('json', schema), async (c) => {
	try {
		const user = getAuthenticatedUserInfo(c);
		if (!user) {
			return c.json({ success: false, message: "Unauthorized", data: null } satisfies GenericResponseInterface, 401);
		}

		const items = c.req.valid('json');
		if (items.length === 0) {
			return c.json({ success: false, message: "At least one transaction is required", data: null } satisfies GenericResponseInterface, 400);
		}

		const { db, client } = createDbClient(c.env);

		const [standardType] = await db
			.select({ id: transactionTypes.id })
			.from(transactionTypes)
			.where(eq(transactionTypes.name, "standard"))
			.limit(1);

		const [transferType] = await db
			.select({ id: transactionTypes.id })
			.from(transactionTypes)
			.where(eq(transactionTypes.name, "transfer"))
			.limit(1);

		const [mustPayType] = await db
			.select({ id: transactionTypes.id })
			.from(transactionTypes)
			.where(eq(transactionTypes.name, "must_pay"))
			.limit(1);

		const walletBalanceCache = new Map<string, number>();
		const walletDelegatedCache = new Map<string, boolean>();

		for (const item of items) {
			const [tx] = await db
				.select()
				.from(transactions)
				.where(and(
					eq(transactions.id, item.transactionId),
					eq(transactions.userId, user.id)
				))
				.limit(1);

			if (!tx) continue;

			if (!walletBalanceCache.has(tx.walletId)) {
				const [wallet] = await db
					.select()
					.from(wallets)
					.where(eq(wallets.id, tx.walletId))
					.limit(1);
				if (wallet) {
					walletBalanceCache.set(tx.walletId, wallet.balance);
					walletDelegatedCache.set(tx.walletId, wallet.isDelegated);
				}
			}

			if (tx.toWalletId && !walletBalanceCache.has(tx.toWalletId)) {
				const [destWallet] = await db
					.select()
					.from(wallets)
					.where(eq(wallets.id, tx.toWalletId))
					.limit(1);
				if (destWallet) {
					walletBalanceCache.set(tx.toWalletId, destWallet.balance);
					walletDelegatedCache.set(tx.toWalletId, destWallet.isDelegated);
				}
			}

			const isTransfer = transferType && tx.transactionTypeId === transferType.id;
			const isStandardDelegated = standardType && tx.transactionTypeId === standardType.id && tx.toWalletId;
			const isMustPay = mustPayType && tx.transactionTypeId === mustPayType.id;

			if (isTransfer) {
				const sourceBalance = (walletBalanceCache.get(tx.walletId) ?? 0) + tx.amount + (tx.fee ?? 0);
				walletBalanceCache.set(tx.walletId, sourceBalance);

				await db.update(wallets)
					.set({ balance: sourceBalance })
					.where(eq(wallets.id, tx.walletId))
					.run();

				const destIsDelegated = walletDelegatedCache.get(tx.toWalletId!) ?? false;
				const destBalance = destIsDelegated
					? (walletBalanceCache.get(tx.toWalletId!) ?? 0) + tx.amount
					: (walletBalanceCache.get(tx.toWalletId!) ?? 0) - tx.amount;
				walletBalanceCache.set(tx.toWalletId!, destBalance);

				await db.update(wallets)
					.set({ balance: destBalance })
					.where(eq(wallets.id, tx.toWalletId!))
					.run();
			} else if (isStandardDelegated) {
				const sourceBalance = (walletBalanceCache.get(tx.walletId) ?? 0) + tx.amount;
				walletBalanceCache.set(tx.walletId, sourceBalance);

				await db.update(wallets)
					.set({ balance: sourceBalance })
					.where(eq(wallets.id, tx.walletId))
					.run();

				const destBalance = (walletBalanceCache.get(tx.toWalletId!) ?? 0) + tx.amount;
				walletBalanceCache.set(tx.toWalletId!, destBalance);

				await db.update(wallets)
					.set({ balance: destBalance })
					.where(eq(wallets.id, tx.toWalletId!))
					.run();
			} else if (isMustPay) {
				const newBalance = (walletBalanceCache.get(tx.walletId) ?? 0) - tx.amount;
				walletBalanceCache.set(tx.walletId, newBalance);

				await db.update(wallets)
					.set({ balance: newBalance })
					.where(eq(wallets.id, tx.walletId))
					.run();
			} else {
				const newBalance = (walletBalanceCache.get(tx.walletId) ?? 0) + tx.amount;
				walletBalanceCache.set(tx.walletId, newBalance);

				await db.update(wallets)
					.set({ balance: newBalance })
					.where(eq(wallets.id, tx.walletId))
					.run();
			}

			if (tx.mustPayTransactionId) {
				const [mustpayTx] = await db
					.select()
					.from(mustPayTransactions)
					.where(eq(mustPayTransactions.id, tx.mustPayTransactionId))
					.limit(1);

				if (mustpayTx) {
					await db.update(mustPayTransactions)
						.set({ remainingAmount: mustpayTx.remainingAmount + Math.abs(tx.amount) })
						.where(eq(mustPayTransactions.id, tx.mustPayTransactionId))
						.run();
				}
			}

			await db.delete(transactions)
				.where(and(
					eq(transactions.id, item.transactionId),
					eq(transactions.userId, user.id)
				))
				.run();
		}

		client.close();

		const res: GenericResponseInterface = {
			success: true,
			message: "Transactions undone successfully",
			data: null,
		};
		return c.json(res, 200);
	} catch (error: any) {
		const response: GenericResponseInterface = {
			success: false,
			message: error
				? `Error while undoing transactions: ${error}${error.code ? ` - ${error.code}` : ''}`
				: 'Error while undoing transactions',
			data: null,
		};
		return c.json(response, 500);
	}
});
