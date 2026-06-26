import { Hono } from "hono";
import Type from 'typebox'
import type { GenericResponseInterface } from '../../../models/GenericResponseInterface';
import { tbValidator } from '@hono/typebox-validator'
import { eq, sql } from "drizzle-orm";
import { ulid } from "ulid";
import { categories } from "../../../../drizzle_tind_tracking/db/schema";
import { createDbClient } from "../../../../drizzle_tind_tracking/db/dbClient";
import { getAuthenticatedUserInfo } from "../../../auth/getAuthenticatedUser";

export const create = new Hono<{ Bindings: Env }>();

const schema = Type.Object({
  name: Type.String(),
  note: Type.Optional(Type.String()),
  icon: Type.Optional(Type.String()),
  color: Type.Optional(Type.String()),
})

create.post('/categories', tbValidator('json', schema), async (c) => {
  try {
    const user = getAuthenticatedUserInfo(c);
    if (!user) {
      return c.json({ success: false, message: "Unauthorized", data: null } satisfies GenericResponseInterface, 401);
    }

    const { name, note, icon, color } = c.req.valid('json');

    const { db, client } = createDbClient(c.env);

    const [existing] = await db
      .select()
      .from(categories)
      .where(sql`LOWER(${categories.name}) = LOWER(${name.trim()})`)
      .limit(1);

    if (existing) {
      client.close();
      return c.json({ success: false, message: "Category with this name already exists", data: null } satisfies GenericResponseInterface, 400);
    }

    const id = ulid();

    await db.insert(categories).values({
      id,
      name: name.trim(),
      note: note?.trim() ?? null,
      icon: icon?.trim() ?? null,
      color: color?.trim() ?? null,
      userId: user.id,
    }).run();

    const [created] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);

    client.close();

    const res: GenericResponseInterface = {
      success: true,
      message: "Category created successfully",
      data: created,
    };
    return c.json(res, 201);
  } catch (error: any) {
    return c.json({
      success: false,
      message: `Error creating category: ${error}${error.code ? ` - ${error.code}` : ""}`,
      data: null,
    } satisfies GenericResponseInterface, 500);
  }
})
