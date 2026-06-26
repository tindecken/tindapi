import { Hono } from 'hono';
import Type from 'typebox';
import type { GenericResponseInterface } from '../../../models/GenericResponseInterface';
import { tbValidator } from '@hono/typebox-validator';
import { eq, desc, and } from 'drizzle-orm';
import { mustPayTransactions, monthPeriods } from '../../../../drizzle_tind_tracking/db/schema';
import { createDbClient } from '../../../../drizzle_tind_tracking/db/dbClient';
import { getAuthenticatedUserInfo } from '../../../auth/getAuthenticatedUser';

export const get = new Hono<{ Bindings: Env }>();

const querySchema = Type.Object({
  monthPeriodId: Type.Optional(Type.String()),
})

get.get('/mustpay', tbValidator('query', querySchema), async (c) => {
  try {
    const user = getAuthenticatedUserInfo(c);
    if (!user) {
      return c.json({ success: false, message: "Unauthorized", data: null } satisfies GenericResponseInterface, 401);
    }

    const { monthPeriodId } = c.req.valid('query');

    const { db, client } = createDbClient(c.env);

    let resolvedMonthPeriodId = monthPeriodId;
    if (!resolvedMonthPeriodId) {
      const [activePeriod] = await db
        .select()
        .from(monthPeriods)
        .where(and(
          eq(monthPeriods.isActive, true),
          eq(monthPeriods.userId, user.id)
        ))
        .orderBy(desc(monthPeriods.updatedAt))
        .limit(1);
      if (activePeriod) {
        resolvedMonthPeriodId = activePeriod.id;
      } else {
        client.close();
        return c.json({ success: false, message: "No active month period found", data: null } satisfies GenericResponseInterface, 400);
      }
    }

    const rows = await db
      .select()
      .from(mustPayTransactions)
      .where(and(
        eq(mustPayTransactions.userId, user.id),
        eq(mustPayTransactions.monthPeriodId, resolvedMonthPeriodId)
      ))
      .orderBy(desc(mustPayTransactions.updatedAt));

    client.close();

    const res: GenericResponseInterface = {
      success: true,
      message: "Must-pay transactions retrieved successfully",
      data: rows,
    };
    return c.json(res, 200);
  } catch (error: any) {
    const response: GenericResponseInterface = {
      success: false,
      message: error
        ? `Error while reading must-pay transactions: ${error}${error.code ? ` - ${error.code}` : ''}`
        : 'Error while reading must-pay transactions',
      data: null,
    };
    return c.json(response, 500);
  }
})
