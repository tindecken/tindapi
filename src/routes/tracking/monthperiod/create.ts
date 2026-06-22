import { Hono } from "hono";
import Type from 'typebox'
import type { GenericResponseInterface } from '../../../models/GenericResponseInterface';
import { tbValidator } from '@hono/typebox-validator'
import { eq } from "drizzle-orm";
import { ulid } from "ulid";
import { monthPeriods } from "../../../../drizzle_tind_tracking/db/schema";
import { createDbClient } from "../../../../drizzle_tind_tracking/db/dbClient";
import { getAuthenticatedUserInfo } from "../../../auth/getAuthenticatedUser";

export const create = new Hono<{ Bindings: Env }>();

const schema = Type.Object({
  name: Type.String(),
  startDate: Type.Number(),
  endDate: Type.Number(),
  isActive: Type.Optional(Type.Boolean()),
})

create.post('/month-periods', tbValidator('json', schema), async (c) => {
  try {
    const user = getAuthenticatedUserInfo(c);
    if (!user) {
      return c.json({ success: false, message: "Unauthorized", data: null } satisfies GenericResponseInterface, 401);
    }

    const { name, startDate, endDate, isActive } = c.req.valid('json');

    const { db, client } = createDbClient(c.env);

    const now = Date.now();
    const id = ulid();

    await db.insert(monthPeriods).values({
      id,
      name,
      startDate,
      endDate,
      isActive: isActive ?? false,
      createdAt: now,
      updatedAt: now,
    }).run();

    const [created] = await db
      .select()
      .from(monthPeriods)
      .where(eq(monthPeriods.id, id))
      .limit(1);

    client.close();

    const res: GenericResponseInterface = {
      success: true,
      message: "Month period created successfully",
      data: created,
    };
    return c.json(res, 201);
  } catch (error: any) {
    return c.json({
      success: false,
      message: `Error creating month period: ${error}${error.code ? ` - ${error.code}` : ""}`,
      data: null,
    } satisfies GenericResponseInterface, 500);
  }
})
