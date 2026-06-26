import { Hono } from 'hono';
import Type from 'typebox';
import type { GenericResponseInterface } from '../../../models/GenericResponseInterface';
import { tbValidator } from '@hono/typebox-validator';
import { eq } from 'drizzle-orm';
import { ulid } from 'ulid';
import {
	mustPayTransactions,
	monthPeriods,
	currencies,
	categories,
	wallets,
} from '../../../../drizzle_tind_tracking/db/schema';
import { createDbClient } from '../../../../drizzle_tind_tracking/db/dbClient';
import { getAuthenticatedUserInfo } from '../../../auth/getAuthenticatedUser';

export const create = new Hono<{ Bindings: Env }>();

const schema = Type.Object({
	name: Type.String(),
	targetAmount: Type.Number(),
	monthPeriodId: Type.String(),
	currencyId: Type.Optional(Type.String()),
	categoryId: Type.Optional(Type.String()),
	walletId: Type.Optional(Type.String()),
})

create.post('/mustpay', tbValidator('json', schema), async (c) => {
	try {
		const user = getAuthenticatedUserInfo(c);
		if (!user) {
			return c.json({ success: false, message: "Unauthorized", data: null } satisfies GenericResponseInterface, 401);
		}

		const { name, targetAmount, monthPeriodId, currencyId, categoryId, walletId } = c.req.valid('json');

		if (targetAmount <= 0) {
			return c.json({ success: false, message: "targetAmount must be positive", data: null } satisfies GenericResponseInterface, 400);
		}

		const { db, client } = createDbClient(c.env);

		const [monthPeriod] = await db
			.select()
			.from(monthPeriods)
			.where(eq(monthPeriods.id, monthPeriodId))
			.limit(1);
		if (!monthPeriod) {
			client.close();
			return c.json({ success: false, message: "Month period not found", data: null } satisfies GenericResponseInterface, 404);
		}
		if (monthPeriod.userId !== user.id) {
			client.close();
			return c.json({ success: false, message: "Month period does not belong to you", data: null } satisfies GenericResponseInterface, 403);
		}

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
		} else {
			const [currency] = await db
				.select()
				.from(currencies)
				.where(eq(currencies.id, resolvedCurrencyId))
				.limit(1);
			if (!currency) {
				client.close();
				return c.json({ success: false, message: "Currency not found", data: null } satisfies GenericResponseInterface, 404);
			}
			if (currency.userId !== user.id) {
				client.close();
				return c.json({ success: false, message: "Currency does not belong to you", data: null } satisfies GenericResponseInterface, 403);
			}
		}

		if (categoryId) {
			const [category] = await db
				.select()
				.from(categories)
				.where(eq(categories.id, categoryId))
				.limit(1);
			if (!category) {
				client.close();
				return c.json({ success: false, message: "Category not found", data: null } satisfies GenericResponseInterface, 404);
			}
			if (category.userId !== user.id && !category.isDefault) {
				client.close();
				return c.json({ success: false, message: "Category does not belong to you", data: null } satisfies GenericResponseInterface, 403);
			}
		}

		if (walletId) {
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
		}

		const id = ulid();
		const mustPayData: Omit<typeof mustPayTransactions.$inferInsert, "createdAt" | "updatedAt"> = {
			id,
			userId: user.id,
			monthPeriodId,
			name,
			targetAmount,
			remainingAmount: targetAmount,
			currencyId: resolvedCurrencyId,
			categoryId: categoryId ?? null,
			walletId: walletId ?? null,
		};
		await db.insert(mustPayTransactions).values(mustPayData).run();

		const [created] = await db
			.select()
			.from(mustPayTransactions)
			.where(eq(mustPayTransactions.id, id))
			.limit(1);

		client.close();

		return c.json({
			success: true,
			message: "Must pay transaction created successfully",
			data: created,
		} satisfies GenericResponseInterface, 201);
	} catch (error: any) {
		const response: GenericResponseInterface = {
			success: false,
			message: error
				? `Error while creating must pay transaction: ${error}${error.code ? ` - ${error.code}` : ''}`
				: 'Error while creating must pay transaction',
			data: null,
		};
		return c.json(response, 500);
	}
});
