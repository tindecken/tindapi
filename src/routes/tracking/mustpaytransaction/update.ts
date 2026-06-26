import { Hono } from 'hono';
import Type from 'typebox';
import type { GenericResponseInterface } from '../../../models/GenericResponseInterface';
import { tbValidator } from '@hono/typebox-validator';
import { eq } from 'drizzle-orm';
import { mustPayTransactions } from '../../../../drizzle_tind_tracking/db/schema';
import { createDbClient } from '../../../../drizzle_tind_tracking/db/dbClient';
import { getAuthenticatedUserInfo } from '../../../auth/getAuthenticatedUser';

export const update = new Hono<{ Bindings: Env }>();

const schema = Type.Object({
  id: Type.String(),
  name: Type.Optional(Type.String()),
  targetAmount: Type.Optional(Type.Number()),
  remainingAmount: Type.Optional(Type.Number()),
  currencyId: Type.Optional(Type.String()),
  categoryId: Type.Optional(Type.String()),
  walletId: Type.Optional(Type.String()),
})

update.put('/mustpay', tbValidator('json', schema), async (c) => {
  try {
    const user = getAuthenticatedUserInfo(c);
    if (!user) {
      return c.json({ success: false, message: "Unauthorized", data: null } satisfies GenericResponseInterface, 401);
    }

    const { id, name, targetAmount, remainingAmount, currencyId, categoryId, walletId } = c.req.valid('json');

    const { db, client } = createDbClient(c.env);

    const [existing] = await db
      .select()
      .from(mustPayTransactions)
      .where(eq(mustPayTransactions.id, id))
      .limit(1);

    if (!existing) {
      client.close();
      return c.json({ success: false, message: "Must-pay transaction not found", data: null } satisfies GenericResponseInterface, 404);
    }
    if (existing.userId !== user.id) {
      client.close();
      return c.json({ success: false, message: "Must-pay transaction does not belong to you", data: null } satisfies GenericResponseInterface, 403);
    }

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name.trim();
    if (targetAmount !== undefined) updateData.targetAmount = targetAmount;
    if (remainingAmount !== undefined) updateData.remainingAmount = remainingAmount;
    if (currencyId !== undefined) updateData.currencyId = currencyId;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (walletId !== undefined) updateData.walletId = walletId;

    await db.update(mustPayTransactions)
      .set(updateData)
      .where(eq(mustPayTransactions.id, id))
      .run();

    const [updated] = await db
      .select()
      .from(mustPayTransactions)
      .where(eq(mustPayTransactions.id, id))
      .limit(1);

    client.close();

    const res: GenericResponseInterface = {
      success: true,
      message: "Must-pay transaction updated successfully",
      data: updated,
    };
    return c.json(res, 200);
  } catch (error: any) {
    const response: GenericResponseInterface = {
      success: false,
      message: error
        ? `Error while updating must-pay transaction: ${error}${error.code ? ` - ${error.code}` : ''}`
        : 'Error while updating must-pay transaction',
      data: null,
    };
    return c.json(response, 500);
  }
})
