import { Hono } from 'hono';
import Type from 'typebox';
import type { GenericResponseInterface } from '../../../models/GenericResponseInterface';
import { tbValidator } from '@hono/typebox-validator';
import { eq, and } from 'drizzle-orm';
import { ulid } from 'ulid';
import {
	transactions,
	mustPayTransactions,
	wallets,
	transactionTypes,
	InsertTransaction,
} from '../../../../drizzle_tind_tracking/db/schema';
import { createDbClient } from '../../../../drizzle_tind_tracking/db/dbClient';
import { getAuthenticatedUserInfo } from '../../../auth/getAuthenticatedUser';

export const createMustpayTransaction = new Hono<{ Bindings: Env }>();

const itemSchema = Type.Object({
	payWalletId: Type.String(),
	mustpayTransactionId: Type.String(),
	amount: Type.Number(),
	note: Type.Optional(Type.String()),
})
const schema = Type.Array(itemSchema)

createMustpayTransaction.post('/mustpay-transactions/pay', tbValidator('json', schema), async (c) => {
	try {
		const user = getAuthenticatedUserInfo(c);
		if (!user) {
			return c.json({ success: false, message: "Unauthorized", data: null } satisfies GenericResponseInterface, 401);
		}

		const items = c.req.valid('json');
		if (items.length === 0) {
			return c.json({ success: false, message: "At least one payment is required", data: null } satisfies GenericResponseInterface, 400);
		}

		const { db, client } = createDbClient(c.env);

		const [mustPayType] = await db
			.select()
			.from(transactionTypes)
			.where(and(
				eq(transactionTypes.name, "must_pay"),
				eq(transactionTypes.userId, user.id)
			))
			.limit(1);

		if (!mustPayType) {
			client.close();
			return c.json({ success: false, message: "Must-pay transaction type not found, create it first", data: null } satisfies GenericResponseInterface, 400);
		}

		const created: (typeof transactions.$inferSelect)[] = [];
		const walletBalanceCache = new Map<string, number>();

		for (const item of items) {
			if (item.amount <= 0) {
				client.close();
				return c.json({ success: false, message: "Amount must be positive", data: null } satisfies GenericResponseInterface, 400);
			}

			const [mustpayTx] = await db
				.select()
				.from(mustPayTransactions)
				.where(and(
					eq(mustPayTransactions.id, item.mustpayTransactionId),
					eq(mustPayTransactions.userId, user.id)
				))
				.limit(1);

			if (!mustpayTx) {
				client.close();
				return c.json({ success: false, message: `Must-pay transaction not found: ${item.mustpayTransactionId}`, data: null } satisfies GenericResponseInterface, 404);
			}
			if (item.amount > mustpayTx.remainingAmount) {
				client.close();
				return c.json({ success: false, message: `Amount (${item.amount}) exceeds remaining (${mustpayTx.remainingAmount}) for "${mustpayTx.name}"`, data: null } satisfies GenericResponseInterface, 400);
			}

			if (!walletBalanceCache.has(item.payWalletId)) {
				const [wallet] = await db
					.select()
					.from(wallets)
					.where(and(
						eq(wallets.id, item.payWalletId),
						eq(wallets.userId, user.id)
					))
					.limit(1);

				if (!wallet) {
					client.close();
					return c.json({ success: false, message: `Wallet not found: ${item.payWalletId}`, data: null } satisfies GenericResponseInterface, 404);
				}
				walletBalanceCache.set(item.payWalletId, wallet.balance);
			}

			const currentBalance = walletBalanceCache.get(item.payWalletId)!;
			if (currentBalance < item.amount) {
				client.close();
				return c.json({ success: false, message: `Insufficient balance in wallet ${item.payWalletId}. Required: ${item.amount}, Available: ${currentBalance}`, data: null } satisfies GenericResponseInterface, 400);
			}

			walletBalanceCache.set(item.payWalletId, currentBalance - item.amount);
			const now = new Date();
			const txId = ulid();
			const transactionData: InsertTransaction = {
				id: txId,
				userId: user.id,
				walletId: item.payWalletId,
				toWalletId: null,
				amount: -item.amount,
				fee: 0,
				currencyId: mustpayTx.currencyId,
				date: now,
				note: item.note ?? `${mustpayTx.name}`,
				category: null,
				monthPeriodId: mustpayTx.monthPeriodId,
				mustPayTransactionId: item.mustpayTransactionId,
				transactionTypeId: mustPayType.id,
			};

			await db.insert(transactions).values(transactionData).run();

			await db.update(wallets)
				.set({ balance: currentBalance - item.amount })
				.where(and(
					eq(wallets.id, item.payWalletId),
					eq(wallets.userId, user.id)
				))
				.run();

			await db.update(mustPayTransactions)
				.set({ remainingAmount: mustpayTx.remainingAmount - item.amount })
				.where(and(
					eq(mustPayTransactions.id, item.mustpayTransactionId),
					eq(mustPayTransactions.userId, user.id)
				))
				.run();

			const [createdTx] = await db
				.select()
				.from(transactions)
				.where(and(
					eq(transactions.id, txId),
					eq(transactions.userId, user.id)
				))
				.limit(1);

			created.push(createdTx);
		}

		client.close();

		const res: GenericResponseInterface = {
			success: true,
			message: `${created.length} must-pay payment(s) completed successfully`,
			data: created,
		};
		return c.json(res, 200);
	} catch (error: any) {
		const response: GenericResponseInterface = {
			success: false,
			message: error
				? `Error while processing must-pay payments: ${error}${error.code ? ` - ${error.code}` : ''}`
				: 'Error while processing must-pay payments',
			data: null,
		};
		return c.json(response, 500);
	}
})
