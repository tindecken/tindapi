import { Hono } from "hono";
import Type from 'typebox'
import type { GenericResponseInterface } from '../../../models/GenericResponseInterface';
import { tbValidator } from '@hono/typebox-validator'
import { eq } from "drizzle-orm";
import { rates } from "../../../../drizzle_tind_tracking/db/schema";
import { createDbClient } from "../../../../drizzle_tind_tracking/db/dbClient";
import { getAuthenticatedUserInfo } from "../../../auth/getAuthenticatedUser";

export const del = new Hono<{ Bindings: Env }>();

const schema = Type.Object({
  id: Type.String(),
})

del.delete('/rates', tbValidator('json', schema), async (c) => {
  try {
    const user = getAuthenticatedUserInfo(c);
    if (!user) {
      return c.json({ success: false, message: "Unauthorized", data: null } satisfies GenericResponseInterface, 401);
    }

    const { id } = c.req.valid('json');

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

    await db.delete(rates)
      .where(eq(rates.id, id))
      .run();

    client.close();

    const res: GenericResponseInterface = {
      success: true,
      message: "Rate deleted successfully",
      data: null,
    };
    return c.json(res, 200);
  } catch (error: any) {
    return c.json({
      success: false,
      message: `Error deleting rate: ${error}${error.code ? ` - ${error.code}` : ""}`,
      data: null,
    } satisfies GenericResponseInterface, 500);
  }
})
