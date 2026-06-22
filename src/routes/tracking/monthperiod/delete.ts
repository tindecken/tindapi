import { Hono } from "hono";
import Type from 'typebox'
import type { GenericResponseInterface } from '../../../models/GenericResponseInterface';
import { tbValidator } from '@hono/typebox-validator'
import { eq, sql } from "drizzle-orm";
import { monthPeriods, transactions, mustPayTransactions } from "../../../../drizzle_tind_tracking/db/schema";
import { createDbClient } from "../../../../drizzle_tind_tracking/db/dbClient";
import { getAuthenticatedUserInfo } from "../../../auth/getAuthenticatedUser";

export const del = new Hono<{ Bindings: Env }>();

const schema = Type.Object({
  id: Type.String(),
})

del.delete('/month-periods', tbValidator('json', schema), async (c) => {
  try {
    const user = getAuthenticatedUserInfo(c);
    if (!user) {
      return c.json({ success: false, message: "Unauthorized", data: null } satisfies GenericResponseInterface, 401);
    }

    const { id } = c.req.valid('json');

    const { db, client } = createDbClient(c.env);

    const [existing] = await db
      .select()
      .from(monthPeriods)
      .where(eq(monthPeriods.id, id))
      .limit(1);

    if (!existing) {
      client.close();
      return c.json({ success: false, message: "Month period not found", data: null } satisfies GenericResponseInterface, 404);
    }
    if (existing.userId !== user.id) {
      client.close();
      return c.json({ success: false, message: "Month period does not belong to you", data: null } satisfies GenericResponseInterface, 403);
    }

    const [txCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(eq(transactions.monthPeriodId, id));

    const [mustPayCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(mustPayTransactions)
      .where(eq(mustPayTransactions.monthPeriodId, id));

    const txTotal = txCount?.count ?? 0;
    const mustPayTotal = mustPayCount?.count ?? 0;

    if (txTotal > 0 || mustPayTotal > 0) {
      client.close();
      return c.json({
        success: false,
        message: `Cannot delete month period: it is in use by ${txTotal} transaction(s) and ${mustPayTotal} must-pay item(s)`,
        data: null,
      } satisfies GenericResponseInterface, 400);
    }

    await db.delete(monthPeriods)
      .where(eq(monthPeriods.id, id))
      .run();

    client.close();

    const res: GenericResponseInterface = {
      success: true,
      message: "Month period deleted successfully",
      data: null,
    };
    return c.json(res, 200);
  } catch (error: any) {
    return c.json({
      success: false,
      message: `Error deleting month period: ${error}${error.code ? ` - ${error.code}` : ""}`,
      data: null,
    } satisfies GenericResponseInterface, 500);
  }
})
