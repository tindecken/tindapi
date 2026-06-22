import { Hono } from "hono";
import Type from 'typebox'
import type { GenericResponseInterface } from '../../../models/GenericResponseInterface';
import { tbValidator } from '@hono/typebox-validator'
import { eq, desc, sql } from "drizzle-orm";
import { monthPeriods } from "../../../../drizzle_tind_tracking/db/schema";
import { createDbClient } from "../../../../drizzle_tind_tracking/db/dbClient";
import { getAuthenticatedUserInfo } from "../../../auth/getAuthenticatedUser";

export const get = new Hono<{ Bindings: Env }>();

const querySchema = Type.Object({
  page: Type.Optional(Type.String()),
  limit: Type.Optional(Type.String()),
})

get.get('/month-periods', tbValidator('query', querySchema), async (c) => {
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
      .from(monthPeriods);

    const totalRecords = countResult?.total ?? 0;
		console.log('totalRecords', totalRecords)
		console.log('limitNumber', limitNumber)
		console.log('pageNumber', pageNumber)

    const rows = await db
      .select()
      .from(monthPeriods)
      .limit(Number(limitNumber))
      .offset(offset)
      .orderBy(desc(monthPeriods.createdAt))
		console.log('rows', rows)
    client.close();

    const res: GenericResponseInterface = {
      success: true,
      message: "Month periods retrieved successfully",
      data: rows,
      totalRecords,
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
