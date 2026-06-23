import { Hono } from "hono";
import Type from 'typebox'
import type { GenericResponseInterface } from '../../../models/GenericResponseInterface';
import { tbValidator } from '@hono/typebox-validator'
import { eq, desc, sql, and } from "drizzle-orm";
import { rates } from "../../../../drizzle_tind_tracking/db/schema";
import { createDbClient } from "../../../../drizzle_tind_tracking/db/dbClient";
import { getAuthenticatedUserInfo } from "../../../auth/getAuthenticatedUser";

export const get = new Hono<{ Bindings: Env }>();

const querySchema = Type.Object({
  currencyFrom: Type.Optional(Type.String()),
  currencyTo: Type.Optional(Type.String()),
  page: Type.Optional(Type.String()),
  limit: Type.Optional(Type.String()),
})

get.get('/rates', tbValidator('query', querySchema), async (c) => {
  try {
    const user = getAuthenticatedUserInfo(c);
    if (!user) {
      return c.json({ success: false, message: "Unauthorized", data: null } satisfies GenericResponseInterface, 401);
    }

    const { currencyFrom, currencyTo, page = "1", limit = "10" } = c.req.valid('query');
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const offset = (pageNumber - 1) * limitNumber;

    const { db, client } = createDbClient(c.env);

    const filters = [eq(rates.userId, user.id)];
    if (currencyFrom) filters.push(eq(rates.currencyFrom, currencyFrom));
    if (currencyTo) filters.push(eq(rates.currencyTo, currencyTo));

    const [countResult] = await db
      .select({ total: sql<number>`count(*)` })
      .from(rates)
      .where(and(...filters));

    const totalRecords = countResult?.total ?? 0;

    const rows = await db
      .select()
      .from(rates)
      .where(and(...filters))
      .orderBy(desc(rates.dateRate))
      .limit(limitNumber)
      .offset(offset);

    client.close();

    const res: GenericResponseInterface = {
      success: true,
      message: "Rates retrieved successfully",
      data: rows,
      totalRecords,
    };
    return c.json(res, 200);
  } catch (error: any) {
    return c.json({
      success: false,
      message: `Error reading rates: ${error}${error.code ? ` - ${error.code}` : ""}`,
      data: null,
    } satisfies GenericResponseInterface, 500);
  }
})
