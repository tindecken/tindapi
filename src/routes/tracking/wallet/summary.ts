import { Hono } from "hono";
import type { GenericResponseInterface } from '../../../models/GenericResponseInterface';
import { eq, and, desc, ne, inArray } from "drizzle-orm";
import { wallets, mustPayTransactions, monthPeriods, settings } from "../../../../drizzle_tind_tracking/db/schema";
import { createDbClient } from "../../../../drizzle_tind_tracking/db/dbClient";
import { getAuthenticatedUserInfo } from "../../../auth/getAuthenticatedUser";

export const getWalletSummary = new Hono<{ Bindings: Env }>();

getWalletSummary.get('/wallets/summary', async (c) => {
  try {
    const user = getAuthenticatedUserInfo(c);
    if (!user) {
      return c.json({ success: false, message: "Unauthorized", data: null } satisfies GenericResponseInterface, 401);
    }

    const { db, client } = createDbClient(c.env);

    const [walletHaveRows, activePeriod, settingsRows, delegatedWallets] = await Promise.all([
      db
        .select({
          name: wallets.name,
          balance: wallets.balance,
        })
        .from(wallets)
        .where(and(
          eq(wallets.userId, user.id),
          eq(wallets.isDelegated, false),
          eq(wallets.isSaving, false)
        )),
      db
        .select()
        .from(monthPeriods)
        .where(and(
          eq(monthPeriods.isActive, true),
          eq(monthPeriods.userId, user.id)
        ))
        .orderBy(desc(monthPeriods.updatedAt))
        .limit(1)
        .then((rows) => rows[0] ?? null),
      db
        .select()
        .from(settings)
        .where(and(
          eq(settings.userId, user.id),
          inArray(settings.name, ['PerDayAmount', 'EndOfPeriodDate'])
        )),
      db
        .select({
          id: wallets.id,
          name: wallets.name,
          balance: wallets.balance,
        })
        .from(wallets)
        .where(and(
          eq(wallets.userId, user.id),
          eq(wallets.isDelegated, true)
        )),
    ]);

    if (!activePeriod) {
      client.close();
      return c.json({ success: false, message: "No active month period found", data: null } satisfies GenericResponseInterface, 400);
    }

    const perDaySetting = settingsRows.find((s) => s.name === 'PerDayAmount');
    const endOfPeriodSetting = settingsRows.find((s) => s.name === 'EndOfPeriodDate');

    if (!perDaySetting || !endOfPeriodSetting) {
      client.close();
      return c.json({ success: false, message: "Settings not found: PerDayAmount and EndOfPeriodDate are required", data: null } satisfies GenericResponseInterface, 400);
    }

    const totalBalance = walletHaveRows.reduce((sum, row) => sum + row.balance, 0);

    let mustPayItems: { name: string; amount: number }[] = [];
    if (activePeriod) {
      const mustPayRows = await db
        .select({
          name: mustPayTransactions.name,
          amount: mustPayTransactions.remainingAmount,
        })
        .from(mustPayTransactions)
        .where(and(
          eq(mustPayTransactions.monthPeriodId, activePeriod.id),
          eq(mustPayTransactions.userId, user.id),
          ne(mustPayTransactions.remainingAmount, 0)
        ));

      mustPayItems = mustPayRows.map((r) => ({
        name: r.name,
        amount: r.amount,
      }));
    }

    // ── Delegated wallets ──
    const delegatedWalletResults = delegatedWallets.map((w) => ({
      name: w.name,
      balance: w.balance,
    }));

    client.close();

    const totalMustPayBalance = mustPayItems.reduce((sum, item) => sum + item.amount, 0);
    const totalDelegatedBalance = delegatedWallets.reduce((sum, w) => sum + w.balance, 0);
    const mustpay = totalMustPayBalance + totalDelegatedBalance;
    const balanceValue = totalBalance - mustpay;

    const perDayAmount = parseFloat(perDaySetting.value ?? "0");
    const endOfPeriodDate = parseInt(endOfPeriodSetting.value ?? "0", 10);

    const endDate = new Date(activePeriod.endDate);
    const endMonth = endDate.getMonth();
    const nextMonth = (endMonth + 1) % 12;
    const year = endMonth === 11 ? endDate.getFullYear() + 1 : endDate.getFullYear();
    const lastDate = new Date(year, nextMonth, endOfPeriodDate);
    const today = new Date();
    const diffMs = lastDate.getTime() - today.getTime();
    const dayRemaining = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);

    const perDay = balanceValue - (dayRemaining -1) * perDayAmount;

    const res: GenericResponseInterface = {
      success: true,
      message: "Wallet summary retrieved successfully",
      data: {
        wallets: walletHaveRows,
        have: totalBalance,
        mustpay,
        balance: balanceValue,
        perDay,
        dayRemaining,
        lastDate: lastDate.toISOString(),
        mustPayItems,
        delegatedWallets: delegatedWalletResults,
      },
    };
    return c.json(res, 200);
  } catch (error: any) {
    return c.json({
      success: false,
      message: `Error reading wallet summary: ${error}${error.code ? ` - ${error.code}` : ""}`,
      data: null,
    } satisfies GenericResponseInterface, 500);
  }
})
