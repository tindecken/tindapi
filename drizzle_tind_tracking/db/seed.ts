import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { eq } from "drizzle-orm";
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
} from "./schema";
import type { TransactionType, ActionType } from "./schema";

// ── Helpers ──────────────────────────────────────────────

const ms = (year: number, month: number, day: number): number =>
  new Date(year, month - 1, day).getTime();

const now = Date.now();

// ── Database Connection ──────────────────────────────────

const url = process.env.TURSO_DATABASE_URL ?? "file://./local.db";
const authToken = process.env.TURSO_AUTH_TOKEN ?? undefined;

const client = createClient({ url, authToken });
const db = drizzle(client);

// ── Seed Data ────────────────────────────────────────────

async function seed() {
  console.log("🌱 Seeding database...\n");

  // ── Clear existing data (reverse FK order) ─────────
  console.log("  Clearing existing data...");
  db.delete(logs).run();
  db.delete(transactions).run();
  db.delete(mustPayTransactions).run();
  db.delete(withdrawFees).run();
  db.delete(monthPeriods).run();
  db.delete(categories).run();
  db.delete(wallets).run();
  db.delete(currencies).run();
  db.delete(verification).run();
  db.delete(account).run();
  db.delete(session).run();
  db.delete(user).run();
  console.log("  Done.\n");

  // ── 1. Users ────────────────────────────────────────
  const users = [
    {
      id: "user_001",
      name: "John Doe",
      email: "john@example.com",
      emailVerified: true,
      image: null,
      createdAt: ms(2026, 4, 1),
      updatedAt: ms(2026, 4, 1),
    },
    {
      id: "user_002",
      name: "Jane Smith",
      email: "jane@example.com",
      emailVerified: true,
      image: null,
      createdAt: ms(2026, 4, 1),
      updatedAt: ms(2026, 4, 1),
    },
  ];
  db.insert(user).values(users).run();
  console.log(`  ✓ Users: ${users.length}`);

  // ── 2. Sessions & Accounts (better-auth boilerplate) ─
  const sessions = [
    {
      id: "ses_001",
      userId: "user_001",
      token: "ses_token_001",
      expiresAt: ms(2026, 12, 31),
      ipAddress: "192.168.1.1",
      userAgent: "Mozilla/5.0",
      createdAt: now,
      updatedAt: now,
    },
  ];
  db.insert(session).values(sessions).run();

  const accounts = [
    {
      id: "acc_001",
      userId: "user_001",
      accountId: "user_001",
      providerId: "credential",
      accessToken: null,
      refreshToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
      scope: null,
      idToken: null,
      password: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "acc_002",
      userId: "user_002",
      accountId: "user_002",
      providerId: "credential",
      accessToken: null,
      refreshToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
      scope: null,
      idToken: null,
      password: null,
      createdAt: now,
      updatedAt: now,
    },
  ];
  db.insert(account).values(accounts).run();
  console.log(`  ✓ Session: ${sessions.length}, Account: ${accounts.length}`);

  // ── 3. Currencies ────────────────────────────────────
  const currencyRows = [
    { id: "cur_vnd", code: "VND", name: "Vietnamese Đồng", isDefault: true },
    { id: "cur_usd", code: "USD", name: "US Dollar", isDefault: false },
  ];
  db.insert(currencies).values(currencyRows).run();
  console.log(`  ✓ Currencies: ${currencyRows.length}`);

  // ── 4. Categories ────────────────────────────────────
  const categoryRows = [
    { id: "cat_salary", name: "Salary", icon: "💰", color: "#22c55e", isSystem: true, userId: null },
    { id: "cat_food", name: "Food & Dining", icon: "🍕", color: "#ef4444", isSystem: true, userId: null },
    { id: "cat_transport", name: "Transport", icon: "🚗", color: "#3b82f6", isSystem: true, userId: null },
    { id: "cat_utilities", name: "Utilities", icon: "⚡", color: "#f59e0b", isSystem: true, userId: null },
    { id: "cat_entertainment", name: "Entertainment", icon: "🎬", color: "#8b5cf6", isSystem: true, userId: null },
    { id: "cat_health", name: "Health", icon: "🏥", color: "#ec4899", isSystem: true, userId: null },
    { id: "cat_shopping", name: "Shopping", icon: "🛍️", color: "#f97316", isSystem: true, userId: null },
    { id: "cat_education", name: "Education", icon: "📚", color: "#06b6d4", isSystem: true, userId: null },
    { id: "cat_bills", name: "Bills & Payments", icon: "📄", color: "#64748b", isSystem: true, userId: null },
    { id: "cat_other", name: "Other", icon: "📌", color: "#a1a1aa", isSystem: true, userId: null },
    {
      id: "cat_side_hustle",
      name: "Side Hustle",
      icon: "💼",
      color: "#14b8a6",
      isSystem: false,
      userId: "user_001",
    },
  ];
  db.insert(categories).values(categoryRows).run();
  console.log(`  ✓ Categories: ${categoryRows.length}`);

  // ── 5. Wallets ───────────────────────────────────────
  const walletRows = [
    { id: "wal_atm", userId: "user_001", name: "ATM", isDefault: true, isDelegated: false, balance: 0, createdAt: ms(2026, 4, 1), updatedAt: ms(2026, 4, 1) },
    { id: "wal_cash", userId: "user_001", name: "Cash", isDefault: false, isDelegated: false, balance: 0, createdAt: ms(2026, 4, 1), updatedAt: ms(2026, 4, 1) },
    { id: "wal_visa", userId: "user_001", name: "Visa", isDefault: false, isDelegated: false, balance: 0, createdAt: ms(2026, 4, 1), updatedAt: ms(2026, 4, 1) },
    { id: "wal_delegated", userId: "user_001", name: "Mom's Wallet", isDefault: false, isDelegated: true, balance: 0, createdAt: ms(2026, 4, 1), updatedAt: ms(2026, 4, 1) },
    { id: "wal_jane_atm", userId: "user_002", name: "Jane's ATM", isDefault: true, isDelegated: false, balance: 0, createdAt: ms(2026, 4, 1), updatedAt: ms(2026, 4, 1) },
  ];
  db.insert(wallets).values(walletRows).run();
  console.log(`  ✓ Wallets: ${walletRows.length}`);

  // ── 6. MonthPeriods ──────────────────────────────────
  const periodRows = [
    {
      id: "per_may_2026",
      name: "May 2026",
      startDate: ms(2026, 4, 28),
      endDate: ms(2026, 5, 22),
      isActive: false,
      createdAt: ms(2026, 4, 28),
    },
    {
      id: "per_jun_2026",
      name: "June 2026",
      startDate: ms(2026, 5, 28),
      endDate: ms(2026, 6, 22),
      isActive: true,
      createdAt: ms(2026, 5, 28),
    },
  ];
  db.insert(monthPeriods).values(periodRows).run();
  console.log(`  ✓ MonthPeriods: ${periodRows.length}`);

  // ── 7. MustPayTransactions ───────────────────────────
  const mustPayRows = [
    {
      id: "mp_rent",
      monthPeriodId: "per_jun_2026",
      name: "Rent",
      targetAmount: 5_000_000,
      remainingAmount: 3_000_000,
      currencyId: "cur_vnd",
      categoryId: "cat_bills",
      sortOrder: 1,
      createdAt: ms(2026, 5, 28),
      updatedAt: ms(2026, 5, 28),
    },
    {
      id: "mp_electricity",
      monthPeriodId: "per_jun_2026",
      name: "Electricity",
      targetAmount: 500_000,
      remainingAmount: 500_000,
      currencyId: "cur_vnd",
      categoryId: "cat_bills",
      sortOrder: 2,
      createdAt: ms(2026, 5, 28),
      updatedAt: ms(2026, 5, 28),
    },
    {
      id: "mp_water",
      monthPeriodId: "per_jun_2026",
      name: "Water",
      targetAmount: 200_000,
      remainingAmount: 200_000,
      currencyId: "cur_vnd",
      categoryId: "cat_bills",
      sortOrder: 3,
      createdAt: ms(2026, 5, 28),
      updatedAt: ms(2026, 5, 28),
    },
    {
      id: "mp_internet",
      monthPeriodId: "per_jun_2026",
      name: "Internet",
      targetAmount: 300_000,
      remainingAmount: 300_000,
      currencyId: "cur_vnd",
      categoryId: "cat_bills",
      sortOrder: 4,
      createdAt: ms(2026, 5, 28),
      updatedAt: ms(2026, 5, 28),
    },
    {
      id: "mp_insurance",
      monthPeriodId: "per_jun_2026",
      name: "Insurance",
      targetAmount: 1_000_000,
      remainingAmount: 1_000_000,
      currencyId: "cur_vnd",
      categoryId: "cat_bills",
      sortOrder: 5,
      createdAt: ms(2026, 5, 28),
      updatedAt: ms(2026, 5, 28),
    },
    {
      id: "mp_haircut",
      monthPeriodId: "per_jun_2026",
      name: "Haircut",
      targetAmount: 100_000,
      remainingAmount: 0,
      currencyId: "cur_vnd",
      categoryId: null,
      sortOrder: 6,
      createdAt: ms(2026, 5, 28),
      updatedAt: ms(2026, 5, 28),
    },
    // May period items
    {
      id: "mp_may_rent",
      monthPeriodId: "per_may_2026",
      name: "Rent",
      targetAmount: 5_000_000,
      remainingAmount: 0,
      currencyId: "cur_vnd",
      categoryId: "cat_bills",
      sortOrder: 1,
      createdAt: ms(2026, 4, 28),
      updatedAt: ms(2026, 4, 28),
    },
    {
      id: "mp_may_haircut",
      monthPeriodId: "per_may_2026",
      name: "Haircut",
      targetAmount: 100_000,
      remainingAmount: 0,
      currencyId: "cur_vnd",
      categoryId: null,
      sortOrder: 2,
      createdAt: ms(2026, 4, 28),
      updatedAt: ms(2026, 4, 28),
    },
  ];
  db.insert(mustPayTransactions).values(mustPayRows).run();
  console.log(`  ✓ MustPayTransactions: ${mustPayRows.length}`);

  // ── 8. WithdrawFees ──────────────────────────────────
  const feeRows = [
    { id: "fee_atm", feeAmount: 22_000, name: "ATM Withdrawal", isDefault: true, createdAt: now },
    { id: "fee_bank_transfer", feeAmount: 11_000, name: "Bank Transfer", isDefault: false, createdAt: now },
  ];
  db.insert(withdrawFees).values(feeRows).run();
  console.log(`  ✓ WithdrawFees: ${feeRows.length}`);

  // ── 9. Transactions ──────────────────────────────────

  interface TxInput {
    id: string;
    type: TransactionType;
    walletId: string;
    toWalletId: string | null;
    amount: number;
    fee: number | null;
    currencyId: string;
    timestamp: number;
    notes: string | null;
    categoryId: string | null;
    customCategory: string | null;
    monthPeriodId: string;
    mustPayTransactionId: string | null;
    relatedTransactionId: string | null;
  }

  const txRows: TxInput[] = [];

  // ── Standard income ──
  txRows.push({
    id: "tx_001",
    type: "standard",
    walletId: "wal_atm",
    toWalletId: null,
    amount: 15_000_000,
    fee: null,
    currencyId: "cur_vnd",
    timestamp: ms(2026, 5, 5),
    notes: "May salary payment",
    categoryId: "cat_salary",
    customCategory: null,
    monthPeriodId: "per_may_2026",
    mustPayTransactionId: null,
    relatedTransactionId: null,
  });

  txRows.push({
    id: "tx_002",
    type: "standard",
    walletId: "wal_atm",
    toWalletId: null,
    amount: 2_000_000,
    fee: null,
    currencyId: "cur_vnd",
    timestamp: ms(2026, 5, 12),
    notes: "Freelance project payment",
    categoryId: "cat_side_hustle",
    customCategory: null,
    monthPeriodId: "per_may_2026",
    mustPayTransactionId: null,
    relatedTransactionId: null,
  });

  txRows.push({
    id: "tx_003",
    type: "standard",
    walletId: "wal_atm",
    toWalletId: null,
    amount: 15_000_000,
    fee: null,
    currencyId: "cur_vnd",
    timestamp: ms(2026, 6, 5),
    notes: "June salary payment",
    categoryId: "cat_salary",
    customCategory: null,
    monthPeriodId: "per_jun_2026",
    mustPayTransactionId: null,
    relatedTransactionId: null,
  });

  // ── Standard expenses ──
  txRows.push({
    id: "tx_004",
    type: "standard",
    walletId: "wal_cash",
    toWalletId: null,
    amount: -150_000,
    fee: null,
    currencyId: "cur_vnd",
    timestamp: ms(2026, 5, 3),
    notes: "Lunch at Pho 24",
    categoryId: "cat_food",
    customCategory: null,
    monthPeriodId: "per_may_2026",
    mustPayTransactionId: null,
    relatedTransactionId: null,
  });

  txRows.push({
    id: "tx_005",
    type: "standard",
    walletId: "wal_atm",
    toWalletId: null,
    amount: -25_000,
    fee: null,
    currencyId: "cur_vnd",
    timestamp: ms(2026, 5, 4),
    notes: "Grab Bike to office",
    categoryId: "cat_transport",
    customCategory: null,
    monthPeriodId: "per_may_2026",
    mustPayTransactionId: null,
    relatedTransactionId: null,
  });

  txRows.push({
    id: "tx_006",
    type: "standard",
    walletId: "wal_visa",
    toWalletId: null,
    amount: -220_000,
    fee: null,
    currencyId: "cur_vnd",
    timestamp: ms(2026, 5, 15),
    notes: "Netflix monthly subscription",
    categoryId: "cat_entertainment",
    customCategory: null,
    monthPeriodId: "per_may_2026",
    mustPayTransactionId: null,
    relatedTransactionId: null,
  });

  txRows.push({
    id: "tx_007",
    type: "standard",
    walletId: "wal_cash",
    toWalletId: null,
    amount: -500_000,
    fee: null,
    currencyId: "cur_vnd",
    timestamp: ms(2026, 6, 2),
    notes: "Weekly groceries at Co.opmart",
    categoryId: "cat_food",
    customCategory: null,
    monthPeriodId: "per_jun_2026",
    mustPayTransactionId: null,
    relatedTransactionId: null,
  });

  txRows.push({
    id: "tx_008",
    type: "standard",
    walletId: "wal_atm",
    toWalletId: null,
    amount: -100_000,
    fee: null,
    currencyId: "cur_vnd",
    timestamp: ms(2026, 6, 3),
    notes: "Gasoline refill",
    categoryId: "cat_transport",
    customCategory: null,
    monthPeriodId: "per_jun_2026",
    mustPayTransactionId: null,
    relatedTransactionId: null,
  });

  txRows.push({
    id: "tx_009",
    type: "standard",
    walletId: "wal_atm",
    toWalletId: null,
    amount: -450_000,
    fee: null,
    currencyId: "cur_vnd",
    timestamp: ms(2026, 6, 8),
    notes: "Electricity bill payment",
    categoryId: "cat_bills",
    customCategory: null,
    monthPeriodId: "per_jun_2026",
    mustPayTransactionId: null,
    relatedTransactionId: null,
  });

  // ── Transfer: ATM withdrawal ──
  txRows.push({
    id: "tx_010",
    type: "transfer",
    walletId: "wal_atm",
    toWalletId: "wal_cash",
    amount: 2_000_000,
    fee: 22_000,
    currencyId: "cur_vnd",
    timestamp: ms(2026, 5, 6),
    notes: "ATM withdrawal for cash spending",
    categoryId: null,
    customCategory: null,
    monthPeriodId: "per_may_2026",
    mustPayTransactionId: null,
    relatedTransactionId: null,
  });

  // ── Transfer: Top up Visa ──
  txRows.push({
    id: "tx_011",
    type: "transfer",
    walletId: "wal_atm",
    toWalletId: "wal_visa",
    amount: 3_000_000,
    fee: null,
    currencyId: "cur_vnd",
    timestamp: ms(2026, 6, 1),
    notes: "Visa card top-up",
    categoryId: null,
    customCategory: null,
    monthPeriodId: "per_jun_2026",
    mustPayTransactionId: null,
    relatedTransactionId: null,
  });

  // ── Delegated transfer ──
  txRows.push({
    id: "tx_012",
    type: "delegated_transfer",
    walletId: "wal_atm",
    toWalletId: "wal_delegated",
    amount: 1_000_000,
    fee: null,
    currencyId: "cur_vnd",
    timestamp: ms(2026, 5, 20),
    notes: "Sent to Mom for weekly expenses",
    categoryId: null,
    customCategory: null,
    monthPeriodId: "per_may_2026",
    mustPayTransactionId: null,
    relatedTransactionId: null,
  });

  // ── Offset ──
  txRows.push({
    id: "tx_013",
    type: "offset",
    walletId: "wal_atm",
    toWalletId: "wal_delegated",
    amount: 1_000_000,
    fee: null,
    currencyId: "cur_vnd",
    timestamp: ms(2026, 5, 10),
    notes: "Offset: delegated expense credit to main wallet",
    categoryId: null,
    customCategory: "Family Transfer",
    monthPeriodId: "per_may_2026",
    mustPayTransactionId: null,
    relatedTransactionId: null,
  });

  // ── Must-pay drawdown ──
  txRows.push({
    id: "tx_014",
    type: "must_pay",
    walletId: "wal_cash",
    toWalletId: null,
    amount: -100_000,
    fee: null,
    currencyId: "cur_vnd",
    timestamp: ms(2026, 6, 10),
    notes: "Haircut at barbershop",
    categoryId: null,
    customCategory: null,
    monthPeriodId: "per_jun_2026",
    mustPayTransactionId: "mp_haircut",
    relatedTransactionId: null,
  });

  // ── Must-pay: paid rent (May) ──
  txRows.push({
    id: "tx_015",
    type: "must_pay",
    walletId: "wal_atm",
    toWalletId: null,
    amount: -5_000_000,
    fee: null,
    currencyId: "cur_vnd",
    timestamp: ms(2026, 5, 1),
    notes: "May rent payment",
    categoryId: "cat_bills",
    customCategory: null,
    monthPeriodId: "per_may_2026",
    mustPayTransactionId: "mp_may_rent",
    relatedTransactionId: null,
  });

  // ── Must-pay: haircut (May) ──
  txRows.push({
    id: "tx_016",
    type: "must_pay",
    walletId: "wal_cash",
    toWalletId: null,
    amount: -100_000,
    fee: null,
    currencyId: "cur_vnd",
    timestamp: ms(2026, 5, 8),
    notes: "May haircut",
    categoryId: null,
    customCategory: null,
    monthPeriodId: "per_may_2026",
    mustPayTransactionId: "mp_may_haircut",
    relatedTransactionId: null,
  });

  // ── Reconciliation ──
  txRows.push({
    id: "tx_017",
    type: "reconciliation",
    walletId: "wal_cash",
    toWalletId: null,
    amount: 50_000,
    fee: null,
    currencyId: "cur_vnd",
    timestamp: ms(2026, 5, 25),
    notes: "Cash balance adjustment — found old money in jacket",
    categoryId: null,
    customCategory: null,
    monthPeriodId: "per_may_2026",
    mustPayTransactionId: null,
    relatedTransactionId: null,
  });

  db.insert(transactions).values(txRows).run();
  console.log(`  ✓ Transactions: ${txRows.length}`);
  console.log(`    • standard: ${txRows.filter((t) => t.type === "standard").length}`);
  console.log(`    • must_pay: ${txRows.filter((t) => t.type === "must_pay").length}`);
  console.log(`    • transfer: ${txRows.filter((t) => t.type === "transfer").length}`);
  console.log(`    • delegated_transfer: ${txRows.filter((t) => t.type === "delegated_transfer").length}`);
  console.log(`    • offset: ${txRows.filter((t) => t.type === "offset").length}`);
  console.log(`    • reconciliation: ${txRows.filter((t) => t.type === "reconciliation").length}`);

  // ── 10. Compute & update balances ────────────────────
  console.log("\n  Computing wallet balances...");

  for (const wallet of walletRows) {
    let balance = 0;

    // Sum all transactions where this wallet is the primary wallet
    const debits = txRows.filter((t) => {
      if (t.walletId !== wallet.id) return false;

      if (t.type === "transfer" || t.type === "delegated_transfer") {
        // Source wallet: loses |amount| + fee
        return -Math.abs(t.amount) - (t.fee ?? 0);
      }
      if (t.type === "offset") {
        if (t.walletId === wallet.id) {
          // Main wallet in offset: credit
          return Math.abs(t.amount);
        }
      }
      // standard, must_pay, reconciliation: use signed amount directly
      return t.amount;
    });

    // Sum all transactions where this wallet is the destination
    const credits = txRows.filter((t) => t.toWalletId === wallet.id);

    for (const t of debits) {
      if (t.type === "transfer" || t.type === "delegated_transfer") {
        balance -= Math.abs(t.amount) + (t.fee ?? 0);
      } else if (t.type === "offset") {
        balance += Math.abs(t.amount);
      } else {
        balance += t.amount;
      }
    }

    for (const t of credits) {
      if (t.type === "transfer" || t.type === "delegated_transfer") {
        balance += Math.abs(t.amount);
      } else if (t.type === "offset") {
        balance -= Math.abs(t.amount);
      }
    }

    db.update(wallets)
      .set({ balance, updatedAt: now })
      .where(eq(wallets.id, wallet.id))
      .run();

    console.log(`    ${wallet.name.padEnd(18)} → ${balance.toLocaleString()} VND`);
  }

  // ── 11. Logs ─────────────────────────────────────────
  const logRows = [
    {
      id: "log_001",
      userId: "user_001",
      actionType: "create" as ActionType,
      message: "User account created",
      metadata: JSON.stringify({ method: "email" }),
      timestamp: ms(2026, 4, 1),
    },
    {
      id: "log_002",
      userId: "user_001",
      actionType: "create" as ActionType,
      message: "Created wallet: ATM, Cash, Visa, Mom's Wallet",
      metadata: null,
      timestamp: ms(2026, 4, 1),
    },
    {
      id: "log_003",
      userId: "user_001",
      actionType: "create" as ActionType,
      message: "Recorded transaction: May salary +15,000,000 VND",
      metadata: JSON.stringify({ transactionId: "tx_001", amount: 15_000_000 }),
      timestamp: ms(2026, 5, 5),
    },
    {
      id: "log_004",
      userId: "user_001",
      actionType: "transfer" as ActionType,
      message: "ATM withdrawal: 2,000,000 VND (fee: 22,000 VND)",
      metadata: JSON.stringify({ transactionId: "tx_010", from: "wal_atm", to: "wal_cash", fee: 22_000 }),
      timestamp: ms(2026, 5, 6),
    },
    {
      id: "log_005",
      userId: "user_001",
      actionType: "transfer" as ActionType,
      message: "Delegated transfer: 1,000,000 VND to Mom's Wallet",
      metadata: JSON.stringify({ transactionId: "tx_012" }),
      timestamp: ms(2026, 5, 20),
    },
    {
      id: "log_006",
      userId: "user_001",
      actionType: "reconcile" as ActionType,
      message: "Cash reconciliation: +50,000 VND adjustment",
      metadata: JSON.stringify({ transactionId: "tx_017" }),
      timestamp: ms(2026, 5, 25),
    },
  ];
  db.insert(logs).values(logRows).run();
  console.log(`\n  ✓ Logs: ${logRows.length}`);

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
  console.log(`  Transactions:       ${txRows.length}`);
  console.log(`  Logs:               ${logRows.length}`);
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
