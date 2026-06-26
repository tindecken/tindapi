import { Hono } from "hono";
import Type from 'typebox'
import type { GenericResponseInterface } from '../../../models/GenericResponseInterface';
import { tbValidator } from '@hono/typebox-validator'
import { eq, desc, sql, or } from "drizzle-orm";
import { categories } from "../../../../drizzle_tind_tracking/db/schema";
import { createDbClient } from "../../../../drizzle_tind_tracking/db/dbClient";
import { getAuthenticatedUserInfo } from "../../../auth/getAuthenticatedUser";

export const get = new Hono<{ Bindings: Env }>();

const querySchema = Type.Object({
  page: Type.Optional(Type.String()),
  limit: Type.Optional(Type.String()),
})

get.get('/categories', tbValidator('query', querySchema), async (c) => {
  try {
    const user = getAuthenticatedUserInfo(c);
    if (!user) {
      return c.json({ success: false, message: "Unauthorized", data: null } satisfies GenericResponseInterface, 401);
    }

    const { page = "1", limit = "10" } = c.req.valid('query');
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const offset = (pageNumber - 1) * limitNumber;

    const { db, client } = createDbClient(c.env);

    const [countResult] = await db
      .select({ total: sql<number>`count(*)` })
      .from(categories)
      .where(or(
        eq(categories.userId, user.id),
        eq(categories.userId, null as any)
      ));

    const totalRecords = countResult?.total ?? 0;

    const rows = await db
      .select()
      .from(categories)
      .where(or(
        eq(categories.userId, user.id),
        eq(categories.userId, null as any)
      ))
      .orderBy(desc(categories.updatedAt))
      .limit(limitNumber)
      .offset(offset);

    client.close();

    const res: GenericResponseInterface = {
      success: true,
      message: "Categories retrieved successfully",
      data: rows,
      totalRecords,
    };
    return c.json(res, 200);
  } catch (error: any) {
    return c.json({
      success: false,
      message: `Error reading categories: ${error}${error.code ? ` - ${error.code}` : ""}`,
      data: null,
    } satisfies GenericResponseInterface, 500);
  }
})
