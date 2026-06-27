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

const schema = Type.Object({
	payWalletId: Type.String(),
	mustpayTransactionId: Type.String(),
	amount: Type.Number(),
})

createMustpayTransaction.post('/mustpay-transactions/pay', tbValidator('json', schema), async (c) => {
	try {
		const user = getAuthenticatedUserInfo(c);
		if (!user) {
			return c.json({ success: false, message: "Unauthorized", data: null } satisfies GenericResponseInterface, 401);
		}

		const { payWalletId, mustpayTransactionId, amount } = c.req.valid('json');

		if (amount <= 0) {
			return c.json({ success: false, message: "Amount must be positive", data: null } satisfies GenericResponseInterface, 400);
		}

		const { db, client } = createDbClient(c.env);

		// ── Validate must-pay transaction ──
		const [mustpayTx] = await db
			.select()
			.from(mustPayTransactions)
			.where(and(
				eq(mustPayTransactions.id, mustpayTransactionId),
				eq(mustPayTransactions.userId, user.id)
			))
			.limit(1);

		if (!mustpayTx) {
			client.close();
			return c.json({ success: false, message: "Must-pay transaction not found", data: null } satisfies GenericResponseInterface, 404);
		}
		if (mustpayTx.userId !== user.id) {
			client.close();
			return c.json({ success: false, message: "Must-pay transaction does not belong to you", data: null } satisfies GenericResponseInterface, 403);
		}
		if (amount > mustpayTx.remainingAmount) {
			client.close();
			return c.json({ success: false, message: `Amount exceeds remaining amount (${mustpayTx.remainingAmount})`, data: null } satisfies GenericResponseInterface, 400);
		}

		// ── Validate pay wallet ──
		const [wallet] = await db
			.select()
			.from(wallets)
			.where(and(
				eq(wallets.id, payWalletId),
				eq(wallets.userId, user.id)
			))
			.limit(1);

		if (!wallet) {
			client.close();
			return c.json({ success: false, message: "Wallet not found", data: null } satisfies GenericResponseInterface, 404);
		}
		if (wallet.userId !== user.id) {
			client.close();
			return c.json({ success: false, message: "Wallet does not belong to you", data: null } satisfies GenericResponseInterface, 403);
		}
		if (wallet.balance < amount) {
			client.close();
			return c.json({ success: false, message: `Insufficient balance in wallet. Required: ${amount}, Available: ${wallet.balance}`, data: null } satisfies GenericResponseInterface, 400);
		}

		// ── Look up "must_pay" transaction type ──
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

		// ── Create the payment transaction ──
		const now = new Date();
		const txId = ulid();
		const transactionData: InsertTransaction = {
			id: txId,
			userId: user.id,
			walletId: payWalletId,
			toWalletId: null,
			amount: -amount,
			fee: 0,
			currencyId: mustpayTx.currencyId,
			date: now,
			note: `${mustpayTx.name}`,
			category: null,
			monthPeriodId: mustpayTx.monthPeriodId,
			mustPayTransactionId: mustpayTransactionId,
			transactionTypeId: mustPayType.id,
		};

		await db.insert(transactions).values(transactionData).run();

		// ── Update wallet balance ──
		await db.update(wallets)
			.set({ balance: wallet.balance - amount })
			.where(and(
				eq(wallets.id, payWalletId),
				eq(wallets.userId, user.id)
			))
			.run();

		// ── Update remaining amount on must-pay transaction ──
		await db.update(mustPayTransactions)
			.set({ remainingAmount: mustpayTx.remainingAmount - amount })
			.where(and(
				eq(mustPayTransactions.id, mustpayTransactionId),
				eq(mustPayTransactions.userId, user.id)
			))
			.run();

		const [created] = await db
			.select()
			.from(transactions)
			.where(and(
				eq(transactions.id, txId),
				eq(transactions.userId, user.id)
			))
			.limit(1);

		client.close();

		const res: GenericResponseInterface = {
			success: true,
			message: `Payment of ${amount} for "${mustpayTx.name}" completed`,
			data: created,
		};
		return c.json(res, 200);
	} catch (error: any) {
		const response: GenericResponseInterface = {
			success: false,
			message: error
				? `Error while processing must-pay payment: ${error}${error.code ? ` - ${error.code}` : ''}`
				: 'Error while processing must-pay payment',
			data: null,
		};
		return c.json(response, 500);
	}
})
