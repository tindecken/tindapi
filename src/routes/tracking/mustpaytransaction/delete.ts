import { Hono } from 'hono';
import Type from 'typebox';
import type { GenericResponseInterface } from '../../../models/GenericResponseInterface';
import { tbValidator } from '@hono/typebox-validator';
import { eq, and } from 'drizzle-orm';
import { mustPayTransactions } from '../../../../drizzle_tind_tracking/db/schema';
import { createDbClient } from '../../../../drizzle_tind_tracking/db/dbClient';
import { getAuthenticatedUserInfo } from '../../../auth/getAuthenticatedUser';

export const del = new Hono<{ Bindings: Env }>();

const schema = Type.Object({
  id: Type.String(),
})

del.delete('/mustpay', tbValidator('json', schema), async (c) => {
  try {
    const user = getAuthenticatedUserInfo(c);
    if (!user) {
      return c.json({ success: false, message: "Unauthorized", data: null } satisfies GenericResponseInterface, 401);
    }

    const { id } = c.req.valid('json');

    const { db, client } = createDbClient(c.env);

    const [existing] = await db
      .select()
      .from(mustPayTransactions)
      .where(and(
        eq(mustPayTransactions.id, id),
        eq(mustPayTransactions.userId, user.id)
      ))
      .limit(1);

    if (!existing) {
      client.close();
      return c.json({ success: false, message: "Must-pay transaction not found", data: null } satisfies GenericResponseInterface, 404);
    }

    await db.delete(mustPayTransactions)
      .where(and(
        eq(mustPayTransactions.id, id),
        eq(mustPayTransactions.userId, user.id)
      ))
      .run();

    client.close();

    const res: GenericResponseInterface = {
      success: true,
      message: "Must-pay transaction deleted successfully",
      data: null,
    };
    return c.json(res, 200);
  } catch (error: any) {
    const response: GenericResponseInterface = {
      success: false,
      message: error
        ? `Error while deleting must-pay transaction: ${error}${error.code ? ` - ${error.code}` : ''}`
        : 'Error while deleting must-pay transaction',
      data: null,
    };
    return c.json(response, 500);
  }
})
