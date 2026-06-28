import { drizzle } from "drizzle-orm/libsql";
import { eq, sql } from "drizzle-orm";
import { ulid } from "ulid";
import { config } from "dotenv";
import { getAuth } from "../../src/auth/auth";
import { createDbClient } from "./dbClient";

config({ path: ".dev.vars" });
import {
  user,
  session,
  account,
  verification,
  wallets,
  currencies,
  categories,
  monthPeriods,
  mustPayTransactions,
  transactions,
  withdrawFees,
  logs,
	transactionTypes,
	settings,
	InsertMustPayTransaction,
} from "./schema";



// ── Helpers ──────────────────────────────────────────────

const ms = (year: number, month: number, day: number): Date =>
  new Date(year, month - 1, day);

const now = sql`(CURRENT_TIMESTAMP)`;

// ── Database Connection ──────────────────────────────────

const url = process.env.TURSO_DATABASE_URL!;
const authToken = process.env.TURSO_AUTH_TOKEN!;

if (!url || !authToken) {
  throw new Error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN environment variables");
} else {
	console.log("Using database URL:", url);
	console.log("Using auth token:", authToken.substring(0, 4) + "..." + authToken.substring(authToken.length - 4));
}

const { db, client } = createDbClient({ TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: authToken });

const auth = getAuth({ BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET!, BETTER_AUTH_URL: process.env.BETTER_AUTH_URL!, GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!, GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!, TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: authToken });


// ── Seed Data ────────────────────────────────────────────

async function seed() {
  console.log("🌱 Seeding database...\n");

	const ctx = await auth.$context;
  const hashedPassword = await ctx.password.hash("rivaldo");

  // ── Clear existing data (reverse FK order) ─────────
  console.log("  Clearing existing data...");
  await db.delete(logs).run();
  await db.delete(settings).run();
  await db.delete(transactions).run();
  await db.delete(mustPayTransactions).run();
  await db.delete(withdrawFees).run();
  await db.delete(monthPeriods).run();
  await db.delete(categories).run();
  await db.delete(wallets).run();
  await db.delete(currencies).run();
  await db.delete(verification).run();
  await db.delete(account).run();
  await db.delete(session).run();
  await db.delete(user).run();
  console.log("  Done.\n");


	// ── Create ULID ────────────────────────────────────────────
	const user1ID = "01KVMRCBPDSNQ3YWK1K36103NY";
	const user2ID = "01KVMRCXETXFG2B00PBFVXJYVT";

  // ── 1. Users ────────────────────────────────────────────
  const users = [
		{
			id: user1ID,
			name: "Tindecken",
			email: "tindecken@gmail.com",
			emailVerified: true,
			image: null
		},
    {
      id: user2ID,
      name: "Hoang Nguyen",
      email: "thaihoang85@gmail.com",
      emailVerified: true,
      image: null,
    },
  ];
  await db.insert(user).values(users).run();
  console.log(`  ✓ Users: ${users.length}`);

  // ── 2. Accounts (better-auth boilerplate) ─

	const accountId1 = ulid();
	const accountId2 = ulid();

  const accounts = [
    {
      id: accountId1,
      userId: user1ID,
      accountId: user1ID,
      providerId: "credential",
			password: hashedPassword,
      accessToken: null,
      refreshToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
      scope: null,
      idToken: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: accountId2,
      userId: user2ID,
      accountId: user2ID,
      providerId: "credential",
      accessToken: null,
      refreshToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
      scope: null,
      idToken: null,
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    },
  ];
  await db.insert(account).values(accounts).run();
  console.log(`  ✓ Account: ${accounts.length}`);

  // ── 3. Currencies ────────────────────────────────────
	const currencyId1 = ulid();
	const currencyId2 = ulid();
  const currencyRows = [
    { id: currencyId1, userId: user1ID, code: "VND", name: "Vietnamese Đồng", isDefault: true },
    { id: currencyId2, userId: user1ID, code: "USD", name: "US Dollar", isDefault: false },
  ];
  await db.insert(currencies).values(currencyRows).run();
  console.log(`  ✓ Currencies: ${currencyRows.length}`);

  // ── 4. Categories ────────────────────────────────────
	const categoryId1 = ulid();
	const categoryId2 = ulid();
  const categoryRows = [
    { id: categoryId1, name: "Unexpected", icon: "💼", color: "#14b8a6", userId: user1ID},
		{ id: categoryId2, name: "Uncategorized", icon: "❓", color: "#9ca3af", isDefault: true, userId: user1ID},
  ];
  await db.insert(categories).values(categoryRows).run();
  console.log(`  ✓ Categories: ${categoryRows.length}`);

  // ── 5. Wallets ───────────────────────────────────────
	const walletId1 = "01KW262KJM42W9QB14BS56RE1Z";
	const walletId2 = "01KW262KJMYPRD3PGNX8XJP37T";
	const walletId3 = "01KW262KJM1KA1Q73J2R8F0JER";
	const walletId4 = "01KW262KJMJSFP6ZFJSGA988AE";
	const walletId5 = "01KW262KJMQTZP3ND6Q04SPAMW";
	const walletId6 = "01KW262KJMJPCJBGBD5RGAC4KT";
  const walletRows = [
    { id: walletId1, userId: user1ID, name: "ATM", isDefault: true, isDelegated: false, balance: 0 },
    { id: walletId2, userId: user1ID, name: "Cash", isDefault: false, isDelegated: false, balance: 0 },
    { id: walletId3, userId: user1ID, name: "HSBC", isDefault: false, isDelegated: false, balance: 0 },
    { id: walletId4, userId: user1ID, name: "Momo", isDefault: false, isDelegated: false, balance: 0 },
		{ id: walletId5, userId: user1ID, name: "Saving (Momo)", isDefault: false, isDelegated: false, isSaving: true, balance: 0 },
    { id: walletId6, userId: user1ID, name: "Nhi", isDefault: false, isDelegated: true, balance: 0 },
  ];
  await db.insert(wallets).values(walletRows).run();
  console.log(`  ✓ Wallets: ${walletRows.length}`);

	// ── 6. Transaction Types ───────────────────────────────
	const transactionTypeId1 = "01KW262KPAVN9XE0FYRGN2AVY5";
	const transactionTypeId2 = "01KW262KPAVE7254NCJ5CY81JJ";
	const transactionTypeId3 = "01KW262KPAE8DDNDVJ3PY8WDFK";
	const transactionTypeId4 = "01KW262KPABEX9F8RGV2B4WA7Q";
	const transactionTypeRows = [
		{ id: transactionTypeId1, name: "standard", userId: user1ID, isDefault: true },
		{ id: transactionTypeId2, name: "reconciliation", userId: user1ID },
		{ id: transactionTypeId3, name: "must_pay", userId: user1ID },
		{ id: transactionTypeId4, name: "transfer", userId: user1ID },
	];
	await db.insert(transactionTypes).values(transactionTypeRows).run();
	console.log(`  ✓ Transaction Types: ${transactionTypeRows.length}`);

  // ── 7. MonthPeriods ──────────────────────────────────
	const monthperiodId1 = "01KW25ST96QDX6W4SNZCCHQG7A";
  const periodRows = [
    {
      id: monthperiodId1,
			userId: user1ID,
      name: "July 2026",
      startDate: sql`strftime('%s', '2026-06-26')`,
      endDate: sql`strftime('%s', '2026-07-26')`,
      isActive: true,
    }
  ];
  await db.insert(monthPeriods).values(periodRows).run();
  console.log(`  ✓ MonthPeriods: ${periodRows.length}`);

  // ── 7. MustPayTransactions ───────────────────────────
const mustPayTransactionId1 = "01KW26CWDYD3DS84R5MXJ452G4";
const mustPayTransactionId2 = "01KW26CWDZJFPGPZJYH8C8WBV3";
const mustPayTransactionId3 = "01KW26CWDZK4YACNRHMBJWR48G";
const mustPayTransactionId4 = "01KW26CWDZMD5Q4BPWYZTYVXE9";
const mustPayTransactionId5 = "01KW26CWDZHHY42NKR9JQN3YW9";
const mustPayTransactionId6 = "01KW26CWDZE2WAFVY2S9AEA1M4";
const mustPayTransactionId7 = "01KW26CWDZ7FG6CY5B67K1Q6TX";
const mustPayTransactionId8 = "01KW26CWDZEVAW86QXAGQR5251";
const mustPayTransactionId9 = "01KW26CWDZ1J33ACCAA0VD17YM";
const mustPayTransactionId10 = "01KW26CWDZXP62253532SJSC0J";
const mustPayTransactionId11 = "01KW26CWDZZSFY8B19Z63AGRR3";
const mustPayTransactionId12 = "01KW26CWDZAGRXFRNC0PAFZRDM";

  const mustPayRows = [
    {
      id: mustPayTransactionId4,
			userId: user1ID,
      monthPeriodId: monthperiodId1,
      name: "xăng 2",
      targetAmount: 800,
      remainingAmount: 800,
      currencyId: currencyId1,
      categoryId: categoryId1,
    },
    {
      id: mustPayTransactionId5,
			userId: user1ID,
      monthPeriodId: monthperiodId1,
      name: "Nhớt xe",
      targetAmount: 150,
      remainingAmount: 150,
      currencyId: currencyId1,
      categoryId: categoryId1,
    },
    {
      id: mustPayTransactionId6,
			userId: user1ID,
      monthPeriodId: monthperiodId1,
      name: "Gửi xe",
      targetAmount: 50,
      remainingAmount: 50,
      currencyId: currencyId1,
      categoryId: null,
    },
    {
      id: mustPayTransactionId7,
			userId: user1ID,
      monthPeriodId: monthperiodId1,
      name: "đt + 4g",
      targetAmount: 100,
      remainingAmount: 100,
      currencyId: currencyId1,
      categoryId: categoryId1,
    },
    {
      id: mustPayTransactionId8,
			userId: user1ID,
      monthPeriodId: monthperiodId1,
      name: "Haircut",
      targetAmount: 150,
      remainingAmount: 150,
      currencyId: currencyId1,
      categoryId: null,
    },
		{
      id: mustPayTransactionId9,
			userId: user1ID,
      monthPeriodId: monthperiodId1,
      name: "xăng 1",
      targetAmount: 680,
      remainingAmount: 680,
      currencyId: currencyId1,
      categoryId: null,
    },
		{
      id: mustPayTransactionId10,
			userId: user1ID,
      monthPeriodId: monthperiodId1,
      name: "rửa xe",
      targetAmount: 70,
      remainingAmount: 70,
      currencyId: currencyId1,
      categoryId: null,
    },
		{
      id: mustPayTransactionId11,
			userId: user1ID,
      monthPeriodId: monthperiodId1,
      name: "Quỹ",
      targetAmount: 5500,
      remainingAmount: 5500,
      currencyId: currencyId1,
      categoryId: null,
    },
		{
      id: mustPayTransactionId12,
			userId: user1ID,
      monthPeriodId: monthperiodId1,
      name: "Y",
      targetAmount: 1000,
      remainingAmount: 1000,
      currencyId: currencyId1,
      categoryId: null,
    },
  ];
  await db.insert(mustPayTransactions).values(mustPayRows).run();
  console.log(`  ✓ MustPayTransactions: ${mustPayRows.length}`);

  // ── 8. WithdrawFees ──────────────────────────────────
	const feeId1 = "01KW26F4B54W8ZJ0RJN810A4PF";
	const feeId2 = "01KW26F4B57K4YFFF0E3R67Y010";
  const feeRows = [
    { id: ulid(), feeAmount: 1, name: "ATM Withdrawal", isDefault: true, createdAt: now },
    { id: ulid(), feeAmount: 3, name: "ATM Withdrawal`", isDefault: false, createdAt: now },
  ];
  await db.insert(withdrawFees).values(feeRows).run();
  console.log(`  ✓ WithdrawFees: ${feeRows.length}`);

  // ── 9. Settings ──────────────────────────────────────
  const settingsRows = [
    { id: ulid(), userId: user1ID, name: "PerDayAmount", value: "200", note: "The daily spend amount" },
    { id: ulid(), userId: user1ID, name: "EndOfPeriodDate", value: "6", note: "The last date to calculate perDay" },
  ];
  await db.insert(settings).values(settingsRows).run();
  console.log(`  ✓ Settings: ${settingsRows.length}`);

  // ── Summary ──────────────────────────────────────────
  console.log("\n──────────────────────────────────────");
  console.log("  ✅ Seed complete!");
  console.log("──────────────────────────────────────");
  console.log(`  Users:              ${users.length}`);
  console.log(`  Currencies:         ${currencyRows.length}`);
  console.log(`  Categories:         ${categoryRows.length}`);
  console.log(`  Wallets:            ${walletRows.length}`);
  console.log(`  Month Periods:      ${periodRows.length}`);
  console.log(`  Must-Pay Items:     ${mustPayRows.length}`);
  console.log(`  Withdraw Fee Rules: ${feeRows.length}`);
  console.log(`  Settings:           ${settingsRows.length}`);
  console.log("──────────────────────────────────────\n");
}

seed()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(() => {
    client.close();
  });
