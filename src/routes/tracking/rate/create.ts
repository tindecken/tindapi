import { Hono } from "hono";
import Type from 'typebox'
import type { GenericResponseInterface } from '../../../models/GenericResponseInterface';
import { tbValidator } from '@hono/typebox-validator'
import { eq } from "drizzle-orm";
import { ulid } from "ulid";
import { rates } from "../../../../drizzle_tind_tracking/db/schema";
import { createDbClient } from "../../../../drizzle_tind_tracking/db/dbClient";
import { getAuthenticatedUserInfo } from "../../../auth/getAuthenticatedUser";

export const create = new Hono<{ Bindings: Env }>();

const schema = Type.Object({
  currencyFrom: Type.String(),
  currencyTo: Type.String(),
  rate: Type.Number(),
  dateRate: Type.Number(),
})

create.post('/rates', tbValidator('json', schema), async (c) => {
  try {
    const user = getAuthenticatedUserInfo(c);
    if (!user) {
      return c.json({ success: false, message: "Unauthorized", data: null } satisfies GenericResponseInterface, 401);
    }

    const { currencyFrom, currencyTo, rate, dateRate } = c.req.valid('json');

    const { db, client } = createDbClient(c.env);

    const id = ulid();
    const now = new Date();
    const rateData: Omit<typeof rates.$inferInsert, "createdAt" | "updatedAt"> = {
      id,
      userId: user.id,
      currencyFrom,
      currencyTo,
      rate,
      dateRate: new Date(dateRate),
    };
    await db.insert(rates).values(rateData).run();

    const [created] = await db
      .select()
      .from(rates)
      .where(eq(rates.id, id))
      .limit(1);

    client.close();

    const res: GenericResponseInterface = {
      success: true,
      message: "Rate created successfully",
      data: created,
    };
    return c.json(res, 201);
  } catch (error: any) {
    return c.json({
      success: false,
      message: `Error creating rate: ${error}${error.code ? ` - ${error.code}` : ""}`,
      data: null,
    } satisfies GenericResponseInterface, 500);
  }
})
