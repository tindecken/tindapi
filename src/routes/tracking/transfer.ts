import { Hono } from "hono";
import Type from 'typebox'
import type { GenericResponseInterface } from '../../models/GenericResponseInterface';
import { tbValidator } from '@hono/typebox-validator'
import { eq, desc } from "drizzle-orm";
import { ulid } from "ulid";
import { wallets, transactions, monthPeriods, currencies, transactionTypes, InsertTransaction } from "../../../drizzle_tind_tracking/db/schema";
import { createDbClient } from "../../../drizzle_tind_tracking/db/dbClient";
import { getAuthenticatedUserInfo } from "../../auth/getAuthenticatedUser";


export const transfer = new Hono<{ Bindings: Env }>();
const schema = Type.Object({
  fromWalletId: Type.String(),
  toWalletId: Type.String(),
  amount: Type.Number(),
  fee: Type.Optional(Type.Number()),
  currencyId: Type.Optional(Type.String()),
  monthPeriodId: Type.Optional(Type.String()),
  notes: Type.Optional(Type.String()),
})

transfer.post('/transfer', tbValidator('json', schema), async (c) => {
  try {
    const user = getAuthenticatedUserInfo(c);
		if(!user) {
			const response: GenericResponseInterface = {
        success: false,
        message: "Unauthorized - Authentication required",
        data: null,
      };
			return c.json(response, 401);
		}
    const { fromWalletId, toWalletId, amount, fee, currencyId, monthPeriodId, notes } = c.req.valid('json');

    if (fromWalletId === toWalletId) {
      return c.json({ success: false, message: "Cannot transfer to the same wallet", data: null } satisfies GenericResponseInterface, 400);
    }
    if (amount <= 0) {
      return c.json({ success: false, message: "Amount must be positive", data: null } satisfies GenericResponseInterface, 400);
    }

    const { db, client } = createDbClient(c.env);

    let resolvedMonthPeriodId = monthPeriodId;
    if (!resolvedMonthPeriodId) {
      const [activePeriod] = await db
        .select()
        .from(monthPeriods)
        .where(eq(monthPeriods.isActive, true))
        .orderBy(desc(monthPeriods.createdAt))
        .limit(1);
      if (activePeriod) {
        resolvedMonthPeriodId = activePeriod.id;
      } else {
        return c.json({ success: false, message: "No active month period found", data: null } satisfies GenericResponseInterface, 400);
      }
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
        return c.json({ success: false, message: "No default currency found", data: null } satisfies GenericResponseInterface, 400);
      }
    }

    const [fromWallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.id, fromWalletId))
      .limit(1);

    if (!fromWallet) {
      return c.json({ success: false, message: "Source wallet not found", data: null } satisfies GenericResponseInterface, 404);
    }
    if (fromWallet.userId !== user.id) {
      return c.json({ success: false, message: "Source wallet does not belong to you", data: null } satisfies GenericResponseInterface, 403);
    }

    const [toWallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.id, toWalletId))
      .limit(1);

    if (!toWallet) {
      return c.json({ success: false, message: "Destination wallet not found", data: null } satisfies GenericResponseInterface, 404);
    }
    if (toWallet.userId !== user.id) {
      return c.json({ success: false, message: "Destination wallet does not belong to you", data: null } satisfies GenericResponseInterface, 403);
    }

    const totalDeduction = amount + (fee ?? 0);
    if (fromWallet.balance < totalDeduction) {
      return c.json({
        success: false,
        message: `Insufficient balance in source wallet. Required: ${totalDeduction}, Available: ${fromWallet.balance}`,
        data: null
      } satisfies GenericResponseInterface, 400);
    }
    const fromNewBalance = fromWallet.balance - totalDeduction;
    const toNewBalance = toWallet.balance + amount;
		// get transactionTypeId for "transfer" type
		const [transferTransactionType] = await db
			.select()
			.from(transactionTypes)
			.where(eq(transactionTypes.name, "transfer"))
			.limit(1);
		if (!transferTransactionType) {
			return c.json({ success: false, message: "Transfer transaction type not found, you should create it first!", data: null } satisfies GenericResponseInterface, 500);
		}
		const txId = ulid();
		const transactionData: InsertTransaction = {
			id: ulid(),
      transactionTypeId: transferTransactionType.id,
      walletId: fromWalletId,
      toWalletId: toWalletId,
      amount: amount,
      fee: fee ?? 0,
      currencyId: resolvedCurrencyId,
      notes: notes ?? null,
      category: null,
      monthPeriodId: resolvedMonthPeriodId,
      mustPayTransactionId: null,
		}
    await db.insert(transactions).values(transactionData).returning();

    await db.update(wallets)
      .set({ balance: fromNewBalance })
      .where(eq(wallets.id, fromWalletId))
      .run();

    await db.update(wallets)
      .set({ balance: toNewBalance })
      .where(eq(wallets.id, toWalletId))
      .run();

    client.close();

    const res: GenericResponseInterface = {
      success: true,
      message: "Transfer successful",
      data: {
        transactionId: txId,
        fromWallet: { id: fromWalletId, previousBalance: fromWallet.balance, newBalance: fromNewBalance },
        toWallet: { id: toWalletId, previousBalance: toWallet.balance, newBalance: toNewBalance },
        amount,
        fee: fee ?? 0,
        timestamp: Date.now(),
      },
    };
    return c.json(res, 200);
  } catch (error: any) {
    const response: GenericResponseInterface = {
      success: false,
      message: error
        ? `Error while transferring between two Wallets: ${error}${error.code ? ` - ${error.code}` : ""}`
        : "Error while transferring between two Wallets",
      data: null,
    };
    return c.json(response, 500);
  }
})
