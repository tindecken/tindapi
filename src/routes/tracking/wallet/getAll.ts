import { Hono } from "hono";
import type { GenericResponseInterface } from '../../../models/GenericResponseInterface';
import { eq, and, desc } from "drizzle-orm";
import { wallets, monthPeriods } from "../../../../drizzle_tind_tracking/db/schema";
import { createDbClient } from "../../../../drizzle_tind_tracking/db/dbClient";
import { getAuthenticatedUserInfo } from "../../../auth/getAuthenticatedUser";

export const getAllWallets = new Hono<{ Bindings: Env }>();

getAllWallets.get('/wallets', async (c) => {
  try {
    const user = getAuthenticatedUserInfo(c);
    if (!user) {
      return c.json({ success: false, message: "Unauthorized", data: null } satisfies GenericResponseInterface, 401);
    }

    const { db, client } = createDbClient(c.env);

    const [activePeriod] = await db
      .select()
      .from(monthPeriods)
      .where(and(
        eq(monthPeriods.isActive, true),
        eq(monthPeriods.userId, user.id)
      ))
      .orderBy(desc(monthPeriods.updatedAt))
      .limit(1);

    if (!activePeriod) {
      client.close();
      return c.json({ success: false, message: "No active month period found", data: null } satisfies GenericResponseInterface, 400);
    }

    const rows = await db
      .select()
      .from(wallets)
      .where(and(
        eq(wallets.userId, user.id),
        eq(wallets.monthPeriodId, activePeriod.id)
      ));

    client.close();

    const res: GenericResponseInterface = {
      success: true,
      message: "Wallets retrieved successfully",
      data: rows,
    };
    return c.json(res, 200);
  } catch (error: any) {
    return c.json({
      success: false,
      message: `Error reading wallet balances: ${error}${error.code ? ` - ${error.code}` : ""}`,
      data: null,
    } satisfies GenericResponseInterface, 500);
  }
})
