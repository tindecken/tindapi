import { Hono } from 'hono';
import type { GenericResponseInterface } from '../../../models/GenericResponseInterface';
import { eq, or } from 'drizzle-orm';
import * as schema from '../../../../drizzle_tind_tracking/db/schema';
import { createDbClient } from '../../../../drizzle_tind_tracking/db/dbClient';
import { getAuthenticatedUserInfo } from '../../../auth/getAuthenticatedUser';

export const exportData = new Hono<{ Bindings: Env }>();

exportData.get('/export', async (c) => {
  try {
    const user = getAuthenticatedUserInfo(c);
    if (!user) {
      return c.json({ success: false, message: 'Unauthorized', data: null } satisfies GenericResponseInterface, 401);
    }

    const { db, client } = createDbClient(c.env);

    const [wallets, transactions, monthPeriods, categories, currencies, rates, transactionTypes, mustPayTransactions, settings] =
      await Promise.all([
        db.select().from(schema.wallets).where(eq(schema.wallets.userId, user.id)),
        db.select().from(schema.transactions).where(eq(schema.transactions.userId, user.id)),
        db.select().from(schema.monthPeriods).where(eq(schema.monthPeriods.userId, user.id)),
        db.select().from(schema.categories).where(
          or(eq(schema.categories.userId, user.id), eq(schema.categories.userId, null as any))
        ),
        db.select().from(schema.currencies).where(eq(schema.currencies.userId, user.id)),
        db.select().from(schema.rates).where(eq(schema.rates.userId, user.id)),
        db.select().from(schema.transactionTypes).where(eq(schema.transactionTypes.userId, user.id)),
        db.select().from(schema.mustPayTransactions).where(eq(schema.mustPayTransactions.userId, user.id)),
        db.select().from(schema.settings).where(eq(schema.settings.userId, user.id)),
      ]);

    client.close();

    const payload = {
      exportedAt: new Date().toISOString(),
      wallets,
      transactions,
      monthPeriods,
      categories,
      currencies,
      rates,
      transactionTypes,
      mustPayTransactions,
      settings,
    };

    return c.newResponse(JSON.stringify(payload, null, 2), 200, {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="tindapi-export-${Date.now()}.json"`,
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        message: `Error exporting data: ${error}${error.code ? ` - ${error.code}` : ''}`,
        data: null,
      } satisfies GenericResponseInterface,
      500
    );
  }
});
