import { Hono } from 'hono';
import type { GenericResponseInterface } from '../../../models/GenericResponseInterface';
import { eq, inArray } from 'drizzle-orm';
import * as schema from '../../../../drizzle_tind_tracking/db/schema';
import { createDbClient } from '../../../../drizzle_tind_tracking/db/dbClient';
import { getAuthenticatedUserInfo } from '../../../auth/getAuthenticatedUser';

export const importData = new Hono<{ Bindings: Env }>();

// ---------------------------------------------------------------------------
// Helper: batch-insert records that don't already exist (matched by id)
// ---------------------------------------------------------------------------
async function insertMissing(
  db: any,
  table: any,
  records: any[]
): Promise<{ inserted: number; skipped: number }> {
  if (!records || records.length === 0) return { inserted: 0, skipped: 0 };

  const ids = records.map((r: any) => r.id);
  const existing = await db
    .select({ id: table.id })
    .from(table)
    .where(inArray(table.id, ids));

  const existingSet = new Set(existing.map((r: any) => r.id));
  const toInsert = records.filter((r: any) => !existingSet.has(r.id));

  if (toInsert.length > 0) {
    await db.insert(table).values(toInsert).run();
  }

  return {
    inserted: toInsert.length,
    skipped: records.length - toInsert.length,
  };
}

// Tables expected in the import payload
const IMPORT_TABLES = [
  'wallets',
  'transactions',
  'monthPeriods',
  'categories',
  'currencies',
  'rates',
  'transactionTypes',
  'mustPayTransactions',
  'settings',
] as const;

importData.post('/import', async (c) => {
  try {
    // -- Auth --
    const user = getAuthenticatedUserInfo(c);
    if (!user) {
      return c.json({ success: false, message: 'Unauthorized', data: null } satisfies GenericResponseInterface, 401);
    }

    // -- Parse body --
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ success: false, message: 'Invalid JSON in request body', data: null } satisfies GenericResponseInterface, 400);
    }

    // -- Validate structure --
    for (const key of IMPORT_TABLES) {
      if (!Array.isArray(body[key])) {
        return c.json(
          {
            success: false,
            message: `Missing or invalid field: "${key}" must be an array`,
            data: null,
          } satisfies GenericResponseInterface,
          400
        );
      }
    }

    // -- Security: all items with a non-null userId must belong to this user --
    for (const key of IMPORT_TABLES) {
      for (const item of body[key]) {
        if (item.userId !== undefined && item.userId !== null && item.userId !== user.id) {
          return c.json(
            {
              success: false,
              message: `Item in "${key}" with id "${item.id}" does not belong to you (userId mismatch)`,
              data: null,
            } satisfies GenericResponseInterface,
            403
          );
        }
      }
    }

    // -- Perform import (single connection, ordered by FK dependencies) --
    const { db, client } = createDbClient(c.env);

    const result: Record<string, { inserted: number; skipped: number }> = {};

    // Level 0: no FK dependencies on other app tables (only userId -> user)
    const [curResult, walResult, catResult, ttResult, mpResult, setResult] = await Promise.all([
      insertMissing(db, schema.currencies, body.currencies),
      insertMissing(db, schema.wallets, body.wallets),
      insertMissing(db, schema.categories, body.categories),
      insertMissing(db, schema.transactionTypes, body.transactionTypes),
      insertMissing(db, schema.monthPeriods, body.monthPeriods),
      insertMissing(db, schema.settings, body.settings),
    ]);
    result.currencies = curResult;
    result.wallets = walResult;
    result.categories = catResult;
    result.transactionTypes = ttResult;
    result.monthPeriods = mpResult;
    result.settings = setResult;

    // Level 1: depends on currencies, monthPeriods, categories
    const [rateResult, mptResult] = await Promise.all([
      insertMissing(db, schema.rates, body.rates),
      insertMissing(db, schema.mustPayTransactions, body.mustPayTransactions),
    ]);
    result.rates = rateResult;
    result.mustPayTransactions = mptResult;

    // Level 2: depends on everything above
    const [txnResult] = await Promise.all([insertMissing(db, schema.transactions, body.transactions)]);
    result.transactions = txnResult;

    client.close();

    // -- Build summary --
    const inserted: Record<string, number> = {};
    const skipped: Record<string, number> = {};
    for (const key of IMPORT_TABLES) {
      inserted[key] = result[key].inserted;
      skipped[key] = result[key].skipped;
    }

    const totalInserted = Object.values(result).reduce((s, r) => s + r.inserted, 0);
    const totalSkipped = Object.values(result).reduce((s, r) => s + r.skipped, 0);

    return c.json(
      {
        success: true,
        message: `Import complete: ${totalInserted} inserted, ${totalSkipped} skipped`,
        data: { inserted, skipped },
      } satisfies GenericResponseInterface,
      200
    );
  } catch (error: any) {
    return c.json(
      {
        success: false,
        message: `Error importing data: ${error}${error.code ? ` - ${error.code}` : ''}`,
        data: null,
      } satisfies GenericResponseInterface,
      500
    );
  }
});
