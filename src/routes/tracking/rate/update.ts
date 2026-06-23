import { Hono } from "hono";
import Type from 'typebox'
import type { GenericResponseInterface } from '../../../models/GenericResponseInterface';
import { tbValidator } from '@hono/typebox-validator'
import { eq } from "drizzle-orm";
import { rates } from "../../../../drizzle_tind_tracking/db/schema";
import { createDbClient } from "../../../../drizzle_tind_tracking/db/dbClient";
import { getAuthenticatedUserInfo } from "../../../auth/getAuthenticatedUser";

export const update = new Hono<{ Bindings: Env }>();

const schema = Type.Object({
  id: Type.String(),
  currencyFrom: Type.Optional(Type.String()),
  currencyTo: Type.Optional(Type.String()),
  rate: Type.Optional(Type.Number()),
  dateRate: Type.Optional(Type.Number()),
})

update.put('/rates', tbValidator('json', schema), async (c) => {
  try {
    const user = getAuthenticatedUserInfo(c);
    if (!user) {
      return c.json({ success: false, message: "Unauthorized", data: null } satisfies GenericResponseInterface, 401);
    }

    const { id, currencyFrom, currencyTo, rate, dateRate } = c.req.valid('json');

    const { db, client } = createDbClient(c.env);

    const [existing] = await db
      .select()
      .from(rates)
      .where(eq(rates.id, id))
      .limit(1);

    if (!existing) {
      client.close();
      return c.json({ success: false, message: "Rate not found", data: null } satisfies GenericResponseInterface, 404);
    }
    if (existing.userId !== user.id) {
      client.close();
      return c.json({ success: false, message: "Rate does not belong to you", data: null } satisfies GenericResponseInterface, 403);
    }

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (currencyFrom !== undefined) updateData.currencyFrom = currencyFrom;
    if (currencyTo !== undefined) updateData.currencyTo = currencyTo;
    if (rate !== undefined) updateData.rate = rate;
    if (dateRate !== undefined) updateData.dateRate = dateRate;

    await db.update(rates)
      .set(updateData)
      .where(eq(rates.id, id))
      .run();

    const [updated] = await db
      .select()
      .from(rates)
      .where(eq(rates.id, id))
      .limit(1);

    client.close();

    const res: GenericResponseInterface = {
      success: true,
      message: "Rate updated successfully",
      data: updated,
    };
    return c.json(res, 200);
  } catch (error: any) {
    return c.json({
      success: false,
      message: `Error updating rate: ${error}${error.code ? ` - ${error.code}` : ""}`,
      data: null,
    } satisfies GenericResponseInterface, 500);
  }
})
