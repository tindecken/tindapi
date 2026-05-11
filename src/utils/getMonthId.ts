import { db } from "../db/index";
import { monthsTable } from "../../drizzle/schema";
import { sql } from "drizzle-orm";

/**
 * Finds a month ID for a given date
 * @param date Date string in YYYY-MM-DD format
 * @returns Promise that resolves to the month ID or -1 if not found
 */
export async function getMonthId(date: string): Promise<number> {
  try {
    console.log('getMonthId - date:', date);
    const data = await db
      .select({ id: monthsTable.id })
      .from(monthsTable)
      .where(
        sql`date(${monthsTable.startDate}) <= date(${date}) AND date(${monthsTable.endDate}) >= date(${date})`
      )
      .limit(1);

    return data[0]?.id ?? -1;
  } catch (error) {
    console.error('Error in getMonthId:', error);
    return -1;
  }
}