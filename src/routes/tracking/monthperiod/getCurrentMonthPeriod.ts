import { Hono } from "hono";
import type { GenericResponseInterface } from '../../../models/GenericResponseInterface';
import { eq, desc, and, lte, gte } from "drizzle-orm";
import { monthPeriods } from "../../../../drizzle_tind_tracking/db/schema";
import { createDbClient } from "../../../../drizzle_tind_tracking/db/dbClient";
import { getAuthenticatedUserInfo } from "../../../auth/getAuthenticatedUser";

export const get = new Hono<{ Bindings: Env }>();

get.get('/month-periods/current', async (c) => {
  try {
    const user = getAuthenticatedUserInfo(c);
    if (!user) {
      return c.json({ success: false, message: "Unauthorized", data: null } satisfies GenericResponseInterface, 401);
    }

    const { db, client } = createDbClient(c.env);

    const now = new Date();
    const [current] = await db
      .select()
      .from(monthPeriods)
      .where(and(
        eq(monthPeriods.isActive, true),
        lte(monthPeriods.startDate, now),
        gte(monthPeriods.endDate, now)
      ))
      .orderBy(desc(monthPeriods.updatedAt))
      .limit(1);

    client.close();

    if (!current) {
      return c.json({ success: false, message: "No active month period found", data: null } satisfies GenericResponseInterface, 404);
    }

    const res: GenericResponseInterface = {
      success: true,
      message: "Current month period retrieved successfully",
      data: current,
    };
    return c.json(res, 200);
  } catch (error: any) {
    return c.json({
      success: false,
      message: `Error reading month periods: ${error}${error.code ? ` - ${error.code}` : ""}`,
      data: null,
    } satisfies GenericResponseInterface, 500);
  }
})
