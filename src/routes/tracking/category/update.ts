import { Hono } from "hono";
import Type from 'typebox'
import type { GenericResponseInterface } from '../../../models/GenericResponseInterface';
import { tbValidator } from '@hono/typebox-validator'
import { eq, and, sql } from "drizzle-orm";
import { categories } from "../../../../drizzle_tind_tracking/db/schema";
import { createDbClient } from "../../../../drizzle_tind_tracking/db/dbClient";
import { getAuthenticatedUserInfo } from "../../../auth/getAuthenticatedUser";

export const update = new Hono<{ Bindings: Env }>();

const schema = Type.Object({
  id: Type.String(),
  name: Type.Optional(Type.String()),
  note: Type.Optional(Type.String()),
  icon: Type.Optional(Type.String()),
  color: Type.Optional(Type.String()),
})

update.put('/categories', tbValidator('json', schema), async (c) => {
  try {
    const user = getAuthenticatedUserInfo(c);
    if (!user) {
      return c.json({ success: false, message: "Unauthorized", data: null } satisfies GenericResponseInterface, 401);
    }

    const { id, name, note, icon, color } = c.req.valid('json');

    const { db, client } = createDbClient(c.env);

    const [existing] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);

    if (!existing) {
      client.close();
      return c.json({ success: false, message: "Category not found", data: null } satisfies GenericResponseInterface, 404);
    }
    if (existing.userId && existing.userId !== user.id) {
      client.close();
      return c.json({ success: false, message: "Category does not belong to you", data: null } satisfies GenericResponseInterface, 403);
    }

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) {
      const trimmed = name.trim();
      const [duplicate] = await db
        .select()
        .from(categories)
        .where(and(
          sql`LOWER(${categories.name}) = LOWER(${trimmed})`,
          eq(categories.userId, user.id)
        ))
        .limit(1);
      if (duplicate && duplicate.id !== id) {
        client.close();
        return c.json({ success: false, message: "Category with this name already exists", data: null } satisfies GenericResponseInterface, 400);
      }
      updateData.name = trimmed;
    }
    if (note !== undefined) updateData.note = note.trim();
    if (icon !== undefined) updateData.icon = icon.trim();
    if (color !== undefined) updateData.color = color.trim();

    await db.update(categories)
      .set(updateData)
      .where(eq(categories.id, id))
      .run();

    const [updated] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);

    client.close();

    const res: GenericResponseInterface = {
      success: true,
      message: `Category "${updated.name}" updated successfully`,
      data: updated,
    };
    return c.json(res, 200);
  } catch (error: any) {
    return c.json({
      success: false,
      message: `Error updating category: ${error}${error.code ? ` - ${error.code}` : ""}`,
      data: null,
    } satisfies GenericResponseInterface, 500);
  }
})
