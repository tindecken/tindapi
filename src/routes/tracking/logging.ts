import { ulid } from "ulid";
import { logs } from "../../../drizzle_tind_tracking/db/schema";
import type { ActionType } from "../../../drizzle_tind_tracking/db/schema";

export async function logAction(
  db: any,
  userId: string,
  actionType: ActionType,
  message: string,
  payload?: Record<string, any>,
  response?: Record<string, any>
) {
  await db.insert(logs).values({
    id: ulid(),
    userId,
    actionType,
    message,
    payload: payload ?? null,
    response: response ?? null,
  }).run();
}
