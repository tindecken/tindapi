import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// ===== Type Aliases =====

export type TransactionType =
  | "standard"
  | "offset"
  | "must_pay"
  | "transfer"
  | "delegated_transfer"
  | "reconciliation";

export type ActionType =
  | "create"
  | "update"
  | "delete"
  | "transfer"
  | "reconcile"
  | "login";

// ===== Auth Tables (better-auth) =====

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull(),
  image: text("image"),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at")
    .notNull()
    .$defaultFn(() => Date.now())
    .$onUpdateFn(() => Date.now()),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  expiresAt: integer("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at")
    .notNull()
    .$defaultFn(() => Date.now())
    .$onUpdateFn(() => Date.now()),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: integer("access_token_expires_at"),
  refreshTokenExpiresAt: integer("refresh_token_expires_at"),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at")
    .notNull()
    .$defaultFn(() => Date.now())
    .$onUpdateFn(() => Date.now()),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at").notNull(),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at")
    .notNull()
    .$defaultFn(() => Date.now())
    .$onUpdateFn(() => Date.now()),
});

// ===== Application Tables =====

export const wallets = sqliteTable("wallet", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  isDelegated: integer("is_delegated", { mode: "boolean" }).notNull().default(false),
  balance: real("balance").notNull().default(0),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at")
    .notNull()
    .$defaultFn(() => Date.now())
    .$onUpdateFn(() => Date.now()),
});

export const currencies = sqliteTable("currency", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
});

export const categories = sqliteTable("category", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon"),
  color: text("color"),
  isSystem: integer("is_system", { mode: "boolean" }).notNull().default(false),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
});

export const monthPeriods = sqliteTable("month_period", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  startDate: integer("start_date").notNull(),
  endDate: integer("end_date").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
});

export const mustPayTransactions = sqliteTable("must_pay_transaction", {
  id: text("id").primaryKey(),
  monthPeriodId: text("month_period_id")
    .notNull()
    .references(() => monthPeriods.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  targetAmount: real("target_amount").notNull(),
  remainingAmount: real("remaining_amount").notNull(),
  currencyId: text("currency_id")
    .notNull()
    .references(() => currencies.id, { onDelete: "restrict" }),
  categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at")
    .notNull()
    .$defaultFn(() => Date.now())
    .$onUpdateFn(() => Date.now()),
});

export const transactions = sqliteTable("transaction", {
  id: text("id").primaryKey(),
  type: text("type").$type<TransactionType>().notNull(),
  walletId: text("wallet_id")
    .notNull()
    .references(() => wallets.id, { onDelete: "restrict" }),
  toWalletId: text("to_wallet_id").references(() => wallets.id, { onDelete: "restrict" }),
  amount: real("amount").notNull(),
  fee: real("fee").default(0),
  currencyId: text("currency_id")
    .notNull()
    .references(() => currencies.id, { onDelete: "restrict" }),
  timestamp: integer("timestamp").notNull().$defaultFn(() => Date.now()),
  notes: text("notes"),
  categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
  customCategory: text("custom_category"),
  monthPeriodId: text("month_period_id")
    .notNull()
    .references(() => monthPeriods.id, { onDelete: "restrict" }),
  mustPayTransactionId: text("must_pay_transaction_id").references(
    () => mustPayTransactions.id,
    { onDelete: "set null" }
  ),
  relatedTransactionId: text("related_transaction_id").references(() => transactions.id, {
    onDelete: "set null",
  }),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at")
    .notNull()
    .$defaultFn(() => Date.now())
    .$onUpdateFn(() => Date.now()),
});

export const withdrawFees = sqliteTable("withdraw_fee", {
  id: text("id").primaryKey(),
  feeAmount: real("fee_amount").notNull(),
  name: text("name").notNull(),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull().$defaultFn(() => Date.now()),
});

export const logs = sqliteTable("log", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  actionType: text("action_type").$type<ActionType>().notNull(),
  message: text("message").notNull(),
  metadata: text("metadata"),
  timestamp: integer("timestamp").notNull().$defaultFn(() => Date.now()),
});

// ===== Relations =====

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  wallets: many(wallets),
  categories: many(categories),
  logs: many(logs),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const verificationRelations = relations(verification, () => ({}));

export const walletRelations = relations(wallets, ({ one, many }) => ({
  user: one(user, {
    fields: [wallets.userId],
    references: [user.id],
  }),
  transactions: many(transactions, { relationName: "walletTransactions" }),
  incomingTransactions: many(transactions, { relationName: "toWalletTransactions" }),
}));

export const currencyRelations = relations(currencies, ({ many }) => ({
  transactions: many(transactions),
  mustPayTransactions: many(mustPayTransactions),
}));

export const categoryRelations = relations(categories, ({ one, many }) => ({
  user: one(user, {
    fields: [categories.userId],
    references: [user.id],
  }),
  transactions: many(transactions),
  mustPayTransactions: many(mustPayTransactions),
}));

export const monthPeriodRelations = relations(monthPeriods, ({ many }) => ({
  transactions: many(transactions),
  mustPayTransactions: many(mustPayTransactions),
}));

export const transactionRelations = relations(transactions, ({ one, many }) => ({
  wallet: one(wallets, {
    fields: [transactions.walletId],
    references: [wallets.id],
    relationName: "walletTransactions",
  }),
  toWallet: one(wallets, {
    fields: [transactions.toWalletId],
    references: [wallets.id],
    relationName: "toWalletTransactions",
  }),
  currency: one(currencies, {
    fields: [transactions.currencyId],
    references: [currencies.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  monthPeriod: one(monthPeriods, {
    fields: [transactions.monthPeriodId],
    references: [monthPeriods.id],
  }),
  mustPayTransaction: one(mustPayTransactions, {
    fields: [transactions.mustPayTransactionId],
    references: [mustPayTransactions.id],
  }),
  relatedTransaction: one(transactions, {
    fields: [transactions.relatedTransactionId],
    references: [transactions.id],
    relationName: "relatedTransactions",
  }),
  childTransactions: many(transactions, { relationName: "relatedTransactions" }),
}));

export const mustPayTransactionRelations = relations(mustPayTransactions, ({ one, many }) => ({
  monthPeriod: one(monthPeriods, {
    fields: [mustPayTransactions.monthPeriodId],
    references: [monthPeriods.id],
  }),
  currency: one(currencies, {
    fields: [mustPayTransactions.currencyId],
    references: [currencies.id],
  }),
  category: one(categories, {
    fields: [mustPayTransactions.categoryId],
    references: [categories.id],
  }),
  transactions: many(transactions),
}));

export const withdrawFeeRelations = relations(withdrawFees, () => ({}));

export const logRelations = relations(logs, ({ one }) => ({
  user: one(user, {
    fields: [logs.userId],
    references: [user.id],
  }),
}));
