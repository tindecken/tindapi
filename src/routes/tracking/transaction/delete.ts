import { Hono } from 'hono';
import Type from 'typebox';
import type { GenericResponseInterface } from '../../../models/GenericResponseInterface';
import { tbValidator } from '@hono/typebox-validator';
import { eq, and, inArray } from 'drizzle-orm';
import { transactions } from '../../../../drizzle_tind_tracking/db/schema';
import { createDbClient } from '../../../../drizzle_tind_tracking/db/dbClient';
import { getAuthenticatedUserInfo } from '../../../auth/getAuthenticatedUser';

export const del = new Hono<{ Bindings: Env }>();

const schema = Type.Object({
  transactionIds: Type.Array(Type.String()),
});

del.delete('/transactions', tbValidator('json', schema), async (c) => {
  try {
    const user = getAuthenticatedUserInfo(c);
    if (!user) {
      return c.json({ success: false, message: 'Unauthorized', data: null } satisfies GenericResponseInterface, 401);
    }

    const { transactionIds } = c.req.valid('json');

    if (transactionIds.length === 0) {
      return c.json({ success: false, message: 'At least one transaction ID is required', data: null } satisfies GenericResponseInterface, 400);
    }

    const { db, client } = createDbClient(c.env);

    const existing = await db
      .select({ id: transactions.id, userId: transactions.userId })
      .from(transactions)
      .where(inArray(transactions.id, transactionIds));

    const existingIds = new Set(existing.map((t) => t.id));

    for (const tx of existing) {
      if (tx.userId !== user.id) {
        client.close();
        return c.json(
          { success: false, message: `Transaction "${tx.id}" does not belong to you`, data: null } satisfies GenericResponseInterface,
          403
        );
      }
    }

    const notFound = transactionIds.filter((id) => !existingIds.has(id));

    await db
      .delete(transactions)
      .where(and(
        eq(transactions.userId, user.id),
        inArray(transactions.id, transactionIds)
      ))
      .run();

    client.close();

    return c.json(
      {
        success: true,
        message: `${existing.length} transaction(s) deleted`,
        data: { deleted: existing.length, notFound },
      } satisfies GenericResponseInterface,
      200
    );
  } catch (error: any) {
    return c.json(
      {
        success: false,
        message: `Error deleting transactions: ${error}${error.code ? ` - ${error.code}` : ''}`,
        data: null,
      } satisfies GenericResponseInterface,
      500
    );
  }
});
