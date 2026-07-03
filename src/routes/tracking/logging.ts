import { ulid } from "ulid";
import { logs } from "../../../drizzle_tind_tracking/db/schema";
import type { ActionType } from "../../../drizzle_tind_tracking/db/schema";

export async function logAction(
  db: any,
  userId: string,
  actionType: ActionType,
  message: string,
  payload?: Record<string, any> | null,
  response?: Record<string, any> | null,
  beforeWallets?: Record<string, number> | null,
  afterWallets?: Record<string, number> | null,
) {
  await db.insert(logs).values({
    id: ulid(),
    userId,
    actionType,
    message,
    payload: payload ?? null,
    response: response ?? null,
    beforeWallets: beforeWallets ?? null,
    afterWallets: afterWallets ?? null,
  }).run();
}
