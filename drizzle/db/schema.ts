import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const logTable = sqliteTable("log", {
  id: text("id").primaryKey(),
  log: text("log").notNull(),
  createdOn: text("created_on").default(sql`(current_timestamp)`).notNull(),
});

export type InsertLog = typeof logTable.$inferInsert;
export type SelectLog = typeof logTable.$inferSelect;
