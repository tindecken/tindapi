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
  transactionTypes,
  InsertTransaction,
} from '../../../../drizzle_tind_tracking/db/schema';
import { createDbClient } from '../../../../drizzle_tind_tracking/db/dbClient';
import { getAuthenticatedUserInfo } from '../../../auth/getAuthenticatedUser';

export const reconcile = new Hono<{ Bindings: Env }>();

const itemSchema = Type.Object({
  walletId: Type.String(),
  balance: Type.Number(),
});
const schema = Type.Array(itemSchema);

reconcile.post('/transactions/reconcile', tbValidator('json', schema), async (c) => {
  try {
    const user = getAuthenticatedUserInfo(c);
    if (!user) {
      return c.json({ success: false, message: 'Unauthorized', data: null } satisfies GenericResponseInterface, 401);
    }

    const items = c.req.valid('json');
    if (items.length === 0) {
      return c.json({ success: false, message: 'At least one wallet is required', data: null } satisfies GenericResponseInterface, 400);
    }

    const { db, client } = createDbClient(c.env);

    const [activePeriod] = await db
      .select()
      .from(monthPeriods)
      .where(eq(monthPeriods.isActive, true))
      .orderBy(desc(monthPeriods.updatedAt))
      .limit(1);

    if (!activePeriod) {
      client.close();
      return c.json({ success: false, message: 'No active month period found', data: null } satisfies GenericResponseInterface, 400);
    }

    const [defaultCurrency] = await db
      .select()
      .from(currencies)
      .where(eq(currencies.isDefault, true))
      .limit(1);

    if (!defaultCurrency) {
      client.close();
      return c.json({ success: false, message: 'No default currency found', data: null } satisfies GenericResponseInterface, 400);
    }

    const [reconcileType] = await db
      .select()
      .from(transactionTypes)
      .where(eq(transactionTypes.name, 'reconciliation'))
      .limit(1);

    if (!reconcileType) {
      client.close();
      return c.json({ success: false, message: 'Reconciliation transaction type not found, create it first', data: null } satisfies GenericResponseInterface, 400);
    }

    const reconciled: any[] = [];
    const skipped: any[] = [];

    for (const item of items) {
      const [wallet] = await db
        .select()
        .from(wallets)
        .where(eq(wallets.id, item.walletId))
        .limit(1);

      if (!wallet) {
        client.close();
        return c.json({ success: false, message: `Wallet not found: ${item.walletId}`, data: null } satisfies GenericResponseInterface, 404);
      }
      if (wallet.userId !== user.id) {
        client.close();
        return c.json({ success: false, message: `Wallet "${item.walletId}" does not belong to you`, data: null } satisfies GenericResponseInterface, 403);
      }

      const diff = item.balance - wallet.balance;

      if (diff === 0) {
        skipped.push({ walletId: item.walletId, balance: item.balance, reason: 'No change needed' });
        continue;
      }

      const txId = ulid();
      const transactionData: InsertTransaction = {
        id: txId,
        userId: user.id,
        walletId: wallet.id,
        amount: diff,
        fee: 0,
        currencyId: defaultCurrency.id,
        date: new Date(),
        note: 'Reconciliation adjustment',
        category: null,
        monthPeriodId: activePeriod.id,
        mustPayTransactionId: null,
        transactionTypeId: reconcileType.id,
        toWalletId: null,
      };

      await db.insert(transactions).values(transactionData).run();

      await db.update(wallets)
        .set({ balance: item.balance })
        .where(eq(wallets.id, wallet.id))
        .run();

      const [createdTx] = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, txId))
        .limit(1);

      reconciled.push({
        walletId: wallet.id,
        previousBalance: wallet.balance,
        newBalance: item.balance,
        diff,
        transaction: createdTx,
      });
    }

    client.close();

    return c.json(
      {
        success: true,
        message: `${reconciled.length} wallet(s) reconciled`,
        data: { reconciled, skipped },
      } satisfies GenericResponseInterface,
      200
    );
  } catch (error: any) {
    return c.json(
      {
        success: false,
        message: `Error reconciling wallets: ${error}${error.code ? ` - ${error.code}` : ''}`,
        data: null,
      } satisfies GenericResponseInterface,
      500
    );
  }
});
