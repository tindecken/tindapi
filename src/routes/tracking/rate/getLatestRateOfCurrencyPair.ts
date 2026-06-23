import { Hono } from "hono";
import Type from 'typebox'
import type { GenericResponseInterface } from '../../../models/GenericResponseInterface';
import { tbValidator } from '@hono/typebox-validator'
import { eq, desc, and } from "drizzle-orm";
import { rates } from "../../../../drizzle_tind_tracking/db/schema";
import { createDbClient } from "../../../../drizzle_tind_tracking/db/dbClient";
import { getAuthenticatedUserInfo } from "../../../auth/getAuthenticatedUser";

export const get = new Hono<{ Bindings: Env }>();

const querySchema = Type.Object({
  currencyFrom: Type.String(),
  currencyTo: Type.String(),
})

get.get('/rates/latest', tbValidator('query', querySchema), async (c) => {
  try {
    const user = getAuthenticatedUserInfo(c);
    if (!user) {
      return c.json({ success: false, message: "Unauthorized", data: null } satisfies GenericResponseInterface, 401);
    }

    const { currencyFrom, currencyTo } = c.req.valid('query');

    const { db, client } = createDbClient(c.env);

    const [latest] = await db
      .select()
      .from(rates)
      .where(and(
        eq(rates.userId, user.id),
        eq(rates.currencyFrom, currencyFrom),
        eq(rates.currencyTo, currencyTo)
      ))
      .orderBy(desc(rates.dateRate))
      .limit(1);

    client.close();

    if (!latest) {
      return c.json({ success: false, message: "No rate found for this currency pair", data: null } satisfies GenericResponseInterface, 404);
    }

    const res: GenericResponseInterface = {
      success: true,
      message: "Latest rate retrieved successfully",
      data: latest,
    };
    return c.json(res, 200);
  } catch (error: any) {
    return c.json({
      success: false,
      message: `Error reading latest rate: ${error}${error.code ? ` - ${error.code}` : ""}`,
      data: null,
    } satisfies GenericResponseInterface, 500);
  }
})
