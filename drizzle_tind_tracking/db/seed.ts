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
      name: "Hoang Nguyen",
      email: "thaihoang85@gmail.com",
      emailVerified: true,
      image: null,
    },
    {
      id: user2ID,
      name: "Tindecken",
      email: "tindecken@gmail.com",
      emailVerified: true,
      image: null
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
    { id: currencyId1, code: "VND", name: "Vietnamese Đồng", isDefault: true },
    { id: currencyId2, code: "USD", name: "US Dollar", isDefault: false },
  ];
  await db.insert(currencies).values(currencyRows).run();
  console.log(`  ✓ Currencies: ${currencyRows.length}`);

  // ── 4. Categories ────────────────────────────────────
	const categoryId1 = ulid();
	const categoryId2 = ulid();
	const categoryId3 = ulid();
	const categoryId4 = ulid();
	const categoryId5 = ulid();
	const categoryId6 = ulid();
	const categoryId7 = ulid();
	const categoryId8 = ulid();
	const categoryId9 = ulid();
	const categoryId10 = ulid();
  const categoryRows = [
    { id: categoryId1, name: "Salary", icon: "💰", color: "#22c55e", userId: user1ID },
    { id: categoryId2, name: "Food & Dining", icon: "🍕", color: "#ef4444", userId: user1ID },
    { id: categoryId3, name: "Transport", icon: "🚗", color: "#3b82f6", userId: user1ID },
    { id: categoryId4, name: "Utilities", icon: "⚡", color: "#f59e0b", userId: user1ID },
    { id: categoryId5, name: "Entertainment", icon: "🎬", color: "#8b5cf6", userId: user1ID },
    { id: categoryId6, name: "Health", icon: "🏥", color: "#ec4899", userId: user1ID },
    { id: categoryId7, name: "Shopping", icon: "🛍️", color: "#f97316", userId: user1ID },
    { id: categoryId8, name: "Other", icon: "📌", color: "#a1a1aa", userId: user1ID },
    {
      id: categoryId9,
      name: "Side Hustle",
      icon: "💼",
      color: "#14b8a6",
      userId: user1ID,
    },
		{
      id: categoryId10,
      name: "Uncategorized",
      icon: "❓",
      color: "#9ca3af",
			isDefault: true,
      userId: user1ID,
    },
  ];
  await db.insert(categories).values(categoryRows).run();
  console.log(`  ✓ Categories: ${categoryRows.length}`);

  // ── 5. Wallets ───────────────────────────────────────
	const walletId1 = ulid();
	const walletId2 = ulid();
	const walletId3 = ulid();
	const walletId4 = ulid();
	const walletId5 = ulid();
	const walletId6 = ulid();
  const walletRows = [
    { id: walletId1, userId: user1ID, name: "ATM", isDefault: true, isDelegated: false, balance: 0 },
    { id: walletId2, userId: user1ID, name: "Cash", isDefault: false, isDelegated: false, balance: 0 },
    { id: walletId3, userId: user1ID, name: "HSBC", isDefault: false, isDelegated: false, balance: 0 },
    { id: walletId4, userId: user1ID, name: "Momo", isDefault: false, isDelegated: false, balance: 0 },
    { id: walletId5, userId: user1ID, name: "Nhi", isDefault: false, isDelegated: true, balance: 0 },
    { id: walletId6, userId: user2ID, name: "Jane's ATM", isDefault: true, isDelegated: false, balance: 0 },
  ];
  await db.insert(wallets).values(walletRows).run();
  console.log(`  ✓ Wallets: ${walletRows.length}`);

	// ── 6. Transaction Types ───────────────────────────────
	const transactionTypeId1 = ulid();
	const transactionTypeId2 = ulid();
	const transactionTypeId3 = ulid();
	const transactionTypeId4 = ulid();
	const transactionTypeRows = [
		{ id: transactionTypeId1, name: "standard", userId: user1ID, isDefault: true },
		{ id: transactionTypeId2, name: "reconciliation", userId: user1ID },
		{ id: transactionTypeId3, name: "must_pay", userId: user1ID },
		{ id: transactionTypeId4, name: "transfer", userId: user1ID },
	];
	await db.insert(transactionTypes).values(transactionTypeRows).run();
	console.log(`  ✓ Transaction Types: ${transactionTypeRows.length}`);

  // ── 7. MonthPeriods ──────────────────────────────────
	const periodId1 = ulid();
	const periodId2 = ulid();
  const periodRows = [
    {
      id: periodId1,
      name: "May 2026",
      startDate: sql`strftime('%Y-%m-%d', 'now')`,
      endDate: sql`strftime('%Y-%m-%d %H:%M:%S', 'now')`,
      isActive: false,
    },
    {
      id: periodId2,
      name: "June 2026",
      startDate: sql`strftime('%s', '2026-05-23')`,
      endDate: sql`(CURRENT_TIMESTAMP)`,
      isActive: true,
    },
  ];
  await db.insert(monthPeriods).values(periodRows).run();
  console.log(`  ✓ MonthPeriods: ${periodRows.length}`);

  // ── 7. MustPayTransactions ───────────────────────────
  const mustPayRows = [
    {
      id: ulid(),
      monthPeriodId: periodId2,
      name: "Rent",
      targetAmount: 5_000_000,
      remainingAmount: 3_000_000,
      currencyId: currencyId1,
      categoryId: categoryId1,
    },
    {
      id: ulid(),
      monthPeriodId: periodId2,
      name: "Electricity",
      targetAmount: 500_000,
      remainingAmount: 500_000,
      currencyId: currencyId1,
      categoryId: categoryId1,
    },
    {
      id: ulid(),
      monthPeriodId: periodId2,
      name: "Water",
      targetAmount: 200_000,
      remainingAmount: 200_000,
      currencyId: currencyId1,
      categoryId: categoryId1,
    },
    {
      id: ulid(),
      monthPeriodId: periodId2,
      name: "Internet",
      targetAmount: 300_000,
      remainingAmount: 300_000,
      currencyId: currencyId1,
      categoryId: categoryId1,
    },
    {
      id: ulid(),
      monthPeriodId: periodId2,
      name: "Insurance",
      targetAmount: 1_000_000,
      remainingAmount: 1_000_000,
      currencyId: currencyId1,
      categoryId: categoryId1,
    },
    {
      id: ulid(),
      monthPeriodId: periodId2,
      name: "Haircut",
      targetAmount: 100_000,
      remainingAmount: 0,
      currencyId: currencyId1,
      categoryId: null,
    },
    // May period items
    {
      id: ulid(),
      monthPeriodId: periodId1,
      name: "Rent",
      targetAmount: 5_000_000,
      remainingAmount: 0,
      currencyId: currencyId1,
      categoryId: categoryId1,
    },
    {
      id: ulid(),
      monthPeriodId: periodId1,
      name: "Haircut",
      targetAmount: 100_000,
      remainingAmount: 0,
      currencyId: currencyId1,
      categoryId: null,
    },
  ];
  await db.insert(mustPayTransactions).values(mustPayRows).run();
  console.log(`  ✓ MustPayTransactions: ${mustPayRows.length}`);

  // ── 8. WithdrawFees ──────────────────────────────────
  const feeRows = [
    { id: ulid(), feeAmount: 22_000, name: "ATM Withdrawal", isDefault: true, createdAt: now },
    { id: ulid(), feeAmount: 11_000, name: "Bank Transfer", isDefault: false, createdAt: now },
  ];
  await db.insert(withdrawFees).values(feeRows).run();
  console.log(`  ✓ WithdrawFees: ${feeRows.length}`);

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
