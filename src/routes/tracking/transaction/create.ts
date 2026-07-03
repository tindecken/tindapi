import { Hono } from 'hono';
import Type from 'typebox';
import type { GenericResponseInterface } from '../../../models/GenericResponseInterface';
import { tbValidator } from '@hono/typebox-validator';
import { eq, and, desc } from 'drizzle-orm';
import { ulid } from 'ulid';
import {
	wallets,
	transactions,
	mustPayTransactions,
	monthPeriods,
	currencies,
	categories,
	transactionTypes,
	InsertTransaction,
} from '../../../../drizzle_tind_tracking/db/schema';
import { createDbClient } from '../../../../drizzle_tind_tracking/db/dbClient';
import { getAuthenticatedUserInfo } from '../../../auth/getAuthenticatedUser';

export const createTransaction = new Hono<{ Bindings: Env }>();
const itemSchema = Type.Object({
	walletId: Type.Optional(Type.String()),
	delegatedWalletId: Type.Optional(Type.String()),
	amount: Type.Number(),
	currencyId: Type.Optional(Type.String()),
	date: Type.Optional(Type.Number()),
	note: Type.String(),
	categoryId: Type.Optional(Type.String()),
	monthPeriodId: Type.Optional(Type.String()),
	mustPayTransactionId: Type.Optional(Type.String()),
})
const schema = Type.Array(itemSchema)

createTransaction.post('/transactions', tbValidator('json', schema), async (c) => {
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

		// ── Resolve shared defaults ──
		const [activePeriod] = await db
			.select()
			.from(monthPeriods)
			.where(eq(monthPeriods.isActive, true))
			.orderBy(desc(monthPeriods.updatedAt))
			.limit(1);

		const [defaultCurrency] = await db
			.select()
			.from(currencies)
			.where(eq(currencies.isDefault, true))
			.limit(1);

		const [defaultWallet] = await db
			.select()
			.from(wallets)
			.where(eq(wallets.isDefault, true))
			.limit(1);

		const [uncategorized] = await db
			.select()
			.from(categories)
			.where(eq(categories.name, "Uncategorized"))
			.limit(1);

		const [standardType] = await db
			.select()
			.from(transactionTypes)
			.where(eq(transactionTypes.name, "standard"))
			.limit(1);

		if (!standardType) {
			client.close();
			return c.json({ success: false, message: "Standard transaction type not found, create it first", data: null } satisfies GenericResponseInterface, 400);
		}

		const [mustPayType] = await db
			.select()
			.from(transactionTypes)
			.where(eq(transactionTypes.name, "must_pay"))
			.limit(1);

		const created: (typeof transactions.$inferSelect)[] = [];

		for (const item of items) {
			const isMustPay = item.mustPayTransactionId != null;

			if (isMustPay && item.delegatedWalletId) {
				client.close();
				return c.json({ success: false, message: "Cannot specify both mustPayTransactionId and delegatedWalletId", data: null } satisfies GenericResponseInterface, 400);
			}

			let mustpayTx: typeof mustPayTransactions.$inferSelect | null = null;
			let resolvedMonthPeriodId: string;
			let resolvedCurrencyId: string;
			let resolvedCategory: string | null;
			let resolvedTransactionTypeId: string;

			if (isMustPay) {
				if (item.amount <= 0) {
					client.close();
					return c.json({ success: false, message: "Amount must be positive for must-pay payments", data: null } satisfies GenericResponseInterface, 400);
				}

				const [found] = await db
					.select()
					.from(mustPayTransactions)
					.where(and(
						eq(mustPayTransactions.id, item.mustPayTransactionId!),
						eq(mustPayTransactions.userId, user.id)
					))
					.limit(1);

				if (!found) {
					client.close();
					return c.json({ success: false, message: `Must-pay transaction not found: ${item.mustPayTransactionId}`, data: null } satisfies GenericResponseInterface, 404);
				}
				if (item.amount > found.remainingAmount) {
					client.close();
					return c.json({ success: false, message: `Amount (${item.amount}) exceeds remaining (${found.remainingAmount}) for "${found.name}"`, data: null } satisfies GenericResponseInterface, 400);
				}

				if (!mustPayType) {
					client.close();
					return c.json({ success: false, message: "Must-pay transaction type not found, create it first", data: null } satisfies GenericResponseInterface, 400);
				}

				mustpayTx = found;
				resolvedMonthPeriodId = found.monthPeriodId;
				resolvedCurrencyId = found.currencyId;
				resolvedCategory = null;
				resolvedTransactionTypeId = mustPayType.id;
			} else {
				resolvedMonthPeriodId = item.monthPeriodId ?? activePeriod?.id ?? '';
				if (!resolvedMonthPeriodId) {
					client.close();
					return c.json({ success: false, message: "No active month period found", data: null } satisfies GenericResponseInterface, 400);
				}

				resolvedCurrencyId = item.currencyId ?? defaultCurrency?.id ?? '';
				if (!resolvedCurrencyId) {
					client.close();
					return c.json({ success: false, message: "No default currency found", data: null } satisfies GenericResponseInterface, 400);
				}

				resolvedCategory = item.categoryId ?? uncategorized?.id ?? null;
				resolvedTransactionTypeId = standardType.id;
			}

			let resolvedPayWalletId = item.walletId;
			if (!resolvedPayWalletId) {
				if (defaultWallet) {
					if (defaultWallet.userId !== user.id) {
						client.close();
						return c.json({ success: false, message: "Default wallet does not belong to you", data: null } satisfies GenericResponseInterface, 403);
					}
					resolvedPayWalletId = defaultWallet.id;
				} else {
					client.close();
					return c.json({ success: false, message: "No default wallet found", data: null } satisfies GenericResponseInterface, 400);
				}
			}

			const [wallet] = await db
				.select()
				.from(wallets)
				.where(eq(wallets.id, resolvedPayWalletId))
				.limit(1);

			if (!wallet) {
				client.close();
				return c.json({ success: false, message: `Wallet not found: ${resolvedPayWalletId}`, data: null } satisfies GenericResponseInterface, 404);
			}
			if (wallet.userId !== user.id) {
				client.close();
				return c.json({ success: false, message: `Wallet ${resolvedPayWalletId} does not belong to you`, data: null } satisfies GenericResponseInterface, 403);
			}

			if (isMustPay && wallet.balance < item.amount) {
				client.close();
				return c.json({ success: false, message: `Insufficient balance in wallet ${resolvedPayWalletId}. Required: ${item.amount}, Available: ${wallet.balance}`, data: null } satisfies GenericResponseInterface, 400);
			}

			const resolvedDate = item.date ? new Date(item.date) : new Date();

			let delegatedWallet: typeof wallets.$inferSelect | null = null;
			if (!isMustPay && item.delegatedWalletId) {
				[delegatedWallet] = await db
					.select()
					.from(wallets)
					.where(eq(wallets.id, item.delegatedWalletId))
					.limit(1);

				if (!delegatedWallet) {
					client.close();
					return c.json({ success: false, message: "Delegated wallet not found", data: null } satisfies GenericResponseInterface, 404);
				}
				if (delegatedWallet.userId !== user.id) {
					client.close();
					return c.json({ success: false, message: "Delegated wallet does not belong to you", data: null } satisfies GenericResponseInterface, 403);
				}
				if (!delegatedWallet.isDelegated) {
					client.close();
					return c.json({ success: false, message: "Wallet is not a delegated wallet", data: null } satisfies GenericResponseInterface, 400);
				}
			}

			const id = ulid();
			const transactionData: InsertTransaction = {
				id,
				userId: user.id,
				walletId: resolvedPayWalletId,
				amount: isMustPay ? -item.amount : item.amount,
				fee: 0,
				currencyId: resolvedCurrencyId,
				date: resolvedDate,
				note: item.note,
				category: resolvedCategory,
				monthPeriodId: resolvedMonthPeriodId,
				mustPayTransactionId: item.mustPayTransactionId ?? null,
				transactionTypeId: resolvedTransactionTypeId,
				toWalletId: !isMustPay ? (item.delegatedWalletId ?? null) : null,
			};

			await db.insert(transactions).values(transactionData).run();

			await db.update(wallets)
				.set({ balance: wallet.balance - item.amount })
				.where(eq(wallets.id, resolvedPayWalletId))
				.run();

			if (delegatedWallet) {
				await db.update(wallets)
					.set({ balance: delegatedWallet.balance - item.amount })
					.where(eq(wallets.id, delegatedWallet.id))
					.run();
			}

			if (isMustPay && mustpayTx) {
				await db.update(mustPayTransactions)
					.set({ remainingAmount: mustpayTx.remainingAmount - item.amount })
					.where(and(
						eq(mustPayTransactions.id, item.mustPayTransactionId!),
						eq(mustPayTransactions.userId, user.id)
					))
					.run();
			}

			const [createdTx] = await db
				.select()
				.from(transactions)
				.where(eq(transactions.id, id))
				.limit(1);

			created.push(createdTx);
		}

		client.close();

		const res: GenericResponseInterface = {
			success: true,
			message: `${created.length} transaction(s) created successfully`,
			data: created,
		};
		return c.json(res, 200);
	} catch (error: any) {
		const response: GenericResponseInterface = {
			success: false,
			message: error
				? `Error while creating transactions: ${error}${error.code ? ` - ${error.code}` : ''}`
				: 'Error while creating transactions',
			data: null,
		};
		return c.json(response, 500);
	}
});
