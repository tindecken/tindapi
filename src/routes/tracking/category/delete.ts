import { Hono } from "hono";
import Type from 'typebox'
import type { GenericResponseInterface } from '../../../models/GenericResponseInterface';
import { tbValidator } from '@hono/typebox-validator'
import { eq, and } from "drizzle-orm";
import { categories, transactions, mustPayTransactions } from "../../../../drizzle_tind_tracking/db/schema";
import { createDbClient } from "../../../../drizzle_tind_tracking/db/dbClient";
import { getAuthenticatedUserInfo } from "../../../auth/getAuthenticatedUser";

export const del = new Hono<{ Bindings: Env }>();

const schema = Type.Object({
  categoryId: Type.String(),
})

del.delete('/categories', tbValidator('json', schema), async (c) => {
  try {
    const user = getAuthenticatedUserInfo(c);
    if (!user) {
      return c.json({ success: false, message: "Unauthorized", data: null } satisfies GenericResponseInterface, 401);
    }

    const { categoryId } = c.req.valid('json');

    const { db, client } = createDbClient(c.env);

    const [existing] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, categoryId))
      .limit(1);

    if (!existing) {
      client.close();
      return c.json({ success: false, message: "Category not found", data: null } satisfies GenericResponseInterface, 404);
    }
    if (existing.userId && existing.userId !== user.id) {
      client.close();
      return c.json({ success: false, message: "Category does not belong to you", data: null } satisfies GenericResponseInterface, 403);
    }

    const [uncategorized] = await db
      .select()
      .from(categories)
      .where(and(
        eq(categories.name, "Uncategorized"),
        eq(categories.userId, user.id)
      ))
      .limit(1);

    if (!uncategorized) {
      client.close();
      return c.json({ success: false, message: "Uncategorized category not found, create it first", data: null } satisfies GenericResponseInterface, 400);
    }

    const uncategorizedId = uncategorized.id;

    await db.update(transactions)
      .set({ category: uncategorizedId })
      .where(and(
        eq(transactions.category, categoryId),
        eq(transactions.userId, user.id)
      ))
      .run();

    await db.update(mustPayTransactions)
      .set({ categoryId: uncategorizedId })
      .where(and(
        eq(mustPayTransactions.categoryId, categoryId),
        eq(mustPayTransactions.userId, user.id)
      ))
      .run();

    await db.delete(categories)
      .where(eq(categories.id, categoryId))
      .run();

    client.close();

    const res: GenericResponseInterface = {
      success: true,
      message: `Category "${existing.name}" deleted successfully, references reassigned to "Uncategorized"`,
      data: null,
    };
    return c.json(res, 200);
  } catch (error: any) {
    return c.json({
      success: false,
      message: `Error deleting category: ${error}${error.code ? ` - ${error.code}` : ""}`,
      data: null,
    } satisfies GenericResponseInterface, 500);
  }
})
