import { Hono } from "hono";
import type { GenericResponseInterface } from "../../../models/GenericResponseInterface";
import { eq, desc } from "drizzle-orm";
import { transactions } from "../../../../drizzle_tind_tracking/db/schema";
import { createDbClient } from "../../../../drizzle_tind_tracking/db/dbClient";
import { getAuthenticatedUserInfo } from "../../../auth/getAuthenticatedUser";

export const getTransactions = new Hono<{ Bindings: Env }>();

getTransactions.get("/transactions", async (c) => {
  try {
    const user = getAuthenticatedUserInfo(c);
    if (!user) {
      return c.json({ success: false, message: "Unauthorized", data: null } satisfies GenericResponseInterface, 401);
    }

    const { db, client } = createDbClient(c.env);

    const page = parseInt(c.req.query("page") ?? "1", 10);
    const limit = parseInt(c.req.query("limit") ?? "20", 10);
    const offset = (page - 1) * limit;

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(transactions)
        .where(eq(transactions.userId, user.id))
        .orderBy(desc(transactions.date))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: transactions.id })
        .from(transactions)
        .where(eq(transactions.userId, user.id))
    ]);

    client.close();

    return c.json({
      success: true,
      message: "Transactions retrieved successfully",
      data: rows,
      totalRecords: countResult.length,
    } satisfies GenericResponseInterface, 200);
  } catch (error: any) {
    return c.json({
      success: false,
      message: `Error reading transactions: ${error}${error.code ? ` - ${error.code}` : ""}`,
      data: null,
    } satisfies GenericResponseInterface, 500);
  }
});
