import { Hono } from "hono";
import Type from 'typebox'
import type { GenericResponseInterface } from '../../../models/GenericResponseInterface';
import { tbValidator } from '@hono/typebox-validator'
import { eq } from "drizzle-orm";
import { monthPeriods } from "../../../../drizzle_tind_tracking/db/schema";
import { createDbClient } from "../../../../drizzle_tind_tracking/db/dbClient";
import { getAuthenticatedUserInfo } from "../../../auth/getAuthenticatedUser";

export const update = new Hono<{ Bindings: Env }>();

const schema = Type.Object({
  id: Type.String(),
  name: Type.Optional(Type.String()),
  startDate: Type.Optional(Type.Number()),
  endDate: Type.Optional(Type.Number()),
  isActive: Type.Optional(Type.Boolean()),
})

update.put('/month-periods', tbValidator('json', schema), async (c) => {
  try {
    const user = getAuthenticatedUserInfo(c);
    if (!user) {
      return c.json({ success: false, message: "Unauthorized", data: null } satisfies GenericResponseInterface, 401);
    }

    const { id, name, startDate, endDate, isActive } = c.req.valid('json');

    const { db, client } = createDbClient(c.env);

    const [existing] = await db
      .select()
      .from(monthPeriods)
      .where(eq(monthPeriods.id, id))
      .limit(1);

    if (!existing) {
      client.close();
      return c.json({ success: false, message: "Month period not found", data: null } satisfies GenericResponseInterface, 404);
    }
    if (existing.userId !== user.id) {
      client.close();
      return c.json({ success: false, message: "Month period does not belong to you", data: null } satisfies GenericResponseInterface, 403);
    }

    const now = new Date();
    const updateData: Record<string, any> = { updatedAt: now };
    if (name !== undefined) updateData.name = name;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (isActive !== undefined) updateData.isActive = isActive;

    await db.update(monthPeriods)
      .set(updateData)
      .where(eq(monthPeriods.id, id))
      .run();

    const [updated] = await db
      .select()
      .from(monthPeriods)
      .where(eq(monthPeriods.id, id))
      .limit(1);

    client.close();

    const res: GenericResponseInterface = {
      success: true,
      message: "Month period updated successfully",
      data: updated,
    };
    return c.json(res, 200);
  } catch (error: any) {
    return c.json({
      success: false,
      message: `Error updating month period: ${error}${error.code ? ` - ${error.code}` : ""}`,
      data: null,
    } satisfies GenericResponseInterface, 500);
  }
})
