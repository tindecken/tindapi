import { Hono } from 'hono';
import Type from 'typebox';
import type { GenericResponseInterface } from '../../../models/GenericResponseInterface';
import { tbValidator } from '@hono/typebox-validator';
import { eq, desc } from 'drizzle-orm';
import { ulid } from 'ulid';
import {
	wallets,
	transactions,
	monthPeriods,
	currencies,
	categories,
	transactionTypes,
	InsertTransaction,
} from '../../../../drizzle_tind_tracking/db/schema';
import { createDbClient } from '../../../../drizzle_tind_tracking/db/dbClient';
import { getAuthenticatedUserInfo } from '../../../auth/getAuthenticatedUser';

export const createStandardTransaction = new Hono<{ Bindings: Env }>();
const schema = Type.Object({
	walletId: Type.String(),
	amount: Type.Number(),
	currencyId: Type.Optional(Type.String()),
	date: Type.Optional(Type.Number()),
	note: Type.Optional(Type.String()),
	categoryId: Type.Optional(Type.String()),
	monthPeriodId: Type.Optional(Type.String()),
})

createStandardTransaction.post('/', tbValidator('json', schema), async (c) => {
	try {
		const user = getAuthenticatedUserInfo(c);
		if (!user) {
			return c.json({ success: false, message: "Unauthorized", data: null } satisfies GenericResponseInterface, 401);
		}

		const { walletId, amount, currencyId, date, note, categoryId, monthPeriodId } = c.req.valid('json');

		const { db, client } = createDbClient(c.env);

		// ── Resolve month period ──
		let resolvedMonthPeriodId = monthPeriodId;
		if (!resolvedMonthPeriodId) {
			const [activePeriod] = await db
				.select()
				.from(monthPeriods)
				.where(eq(monthPeriods.isActive, true))
				.orderBy(desc(monthPeriods.updatedAt))
				.limit(1);
			if (activePeriod) {
				resolvedMonthPeriodId = activePeriod.id;
			} else {
				client.close();
				return c.json({ success: false, message: "No active month period found", data: null } satisfies GenericResponseInterface, 400);
			}
		}

		// ── Resolve currency ──
		let resolvedCurrencyId = currencyId;
		if (!resolvedCurrencyId) {
			const [defaultCurrency] = await db
				.select()
				.from(currencies)
				.where(eq(currencies.isDefault, true))
				.limit(1);
			if (defaultCurrency) {
				resolvedCurrencyId = defaultCurrency.id;
			} else {
				client.close();
				return c.json({ success: false, message: "No default currency found", data: null } satisfies GenericResponseInterface, 400);
			}
		}

		// ── Validate wallet ──
		const [wallet] = await db
			.select()
			.from(wallets)
			.where(eq(wallets.id, walletId))
			.limit(1);

		if (!wallet) {
			client.close();
			return c.json({ success: false, message: "Wallet not found", data: null } satisfies GenericResponseInterface, 404);
		}
		if (wallet.userId !== user.id) {
			client.close();
			return c.json({ success: false, message: "Wallet does not belong to you", data: null } satisfies GenericResponseInterface, 403);
		}

		// ── Resolve category ──
		let resolvedCategory: string | null = categoryId ?? null;
		if (!resolvedCategory) {
			const [uncategorized] = await db
				.select()
				.from(categories)
				.where(eq(categories.name, "Uncategorized"))
				.limit(1);
			if (uncategorized) {
				resolvedCategory = uncategorized.id;
			}
		}

		// ── Resolve transaction type ──
		const [standardType] = await db
			.select()
			.from(transactionTypes)
			.where(eq(transactionTypes.name, "standard"))
			.limit(1);
		if (!standardType) {
			client.close();
			return c.json({ success: false, message: "Standard transaction type not found, create it first", data: null } satisfies GenericResponseInterface, 400);
		}

		// ── Resolve date ──
		const resolvedDate = date ? new Date(date) : new Date();

		// ── Create transaction ──
		const now = new Date();
		const id = ulid();
		const transactionData: InsertTransaction = {
			id,
			userId: user.id,
			walletId,
			toWalletId: null,
			amount,
			fee: 0,
			currencyId: resolvedCurrencyId,
			date: resolvedDate,
			note: note ?? null,
			category: resolvedCategory,
			monthPeriodId: resolvedMonthPeriodId,
			mustPayTransactionId: null,
			transactionTypeId: standardType.id,
		};

		await db.insert(transactions).values(transactionData).run();

		// ── Update wallet balance ──
		await db.update(wallets)
			.set({ balance: wallet.balance + amount })
			.where(eq(wallets.id, walletId))
			.run();

		const [created] = await db
			.select()
			.from(transactions)
			.where(eq(transactions.id, id))
			.limit(1);

		client.close();

		const res: GenericResponseInterface = {
			success: true,
			message: 'Transaction has been created successfully',
			data: created,
		};
		return c.json(res, 200);
	} catch (error: any) {
		const response: GenericResponseInterface = {
			success: false,
			message: error
				? `Error while creating transaction: ${error}${error.code ? ` - ${error.code}` : ''}`
				: 'Error while creating transaction',
			data: null,
		};
		return c.json(response, 500);
	}
});
