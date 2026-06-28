import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations, sql } from "drizzle-orm";

// ===== Type Aliases =====

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
  createdAt: integer("created_at", {mode: "timestamp"}).notNull().$defaultFn(() => sql`strftime('%s', 'now')`),
  updatedAt: integer("updated_at", {mode: "timestamp"})
    .notNull()
    .$defaultFn(() => sql`strftime('%s', 'now')`)
    .$onUpdateFn(() => sql`strftime('%s', 'now')`),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  expiresAt: integer("expires_at", {mode: "timestamp"}).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: integer("created_at", {mode: "timestamp"}).notNull().$defaultFn(() => sql`strftime('%s', 'now')`),
  updatedAt: integer("updated_at", {mode: "timestamp"})
    .notNull()
    .$defaultFn(() => sql`strftime('%s', 'now')`)
    .$onUpdateFn(() => sql`strftime('%s', 'now')`),
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
  accessTokenExpiresAt: integer("access_token_expires_at", {mode: "timestamp"}),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {mode: "timestamp"}),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: integer("created_at", {mode: "timestamp"}).notNull().$defaultFn(() => sql`strftime('%s', 'now')`),
  updatedAt: integer("updated_at", {mode: "timestamp"})
    .notNull()
    .$defaultFn(() => sql`strftime('%s', 'now')`)
    .$onUpdateFn(() => sql`strftime('%s', 'now')`),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", {mode: "timestamp"}).notNull(),
  createdAt: integer("created_at", {mode: "timestamp"}).notNull().$defaultFn(() => sql`strftime('%s', 'now')`),
  updatedAt: integer("updated_at", {mode: "timestamp"})
    .notNull()
    .$defaultFn(() => sql`strftime('%s', 'now')`)
    .$onUpdateFn(() => sql`strftime('%s', 'now')`),
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
  isSaving: integer("is_saving", { mode: "boolean" }).notNull().default(false),
  balance: real("balance").notNull().default(0),
  createdAt: integer("created_at", {mode: "timestamp"}).notNull().$defaultFn(() => sql`strftime('%s', 'now')`),
  updatedAt: integer("updated_at", {mode: "timestamp"})
    .notNull()
    .$defaultFn(() => sql`strftime('%s', 'now')`)
    .$onUpdateFn(() => sql`strftime('%s', 'now')`),
});

export const currencies = sqliteTable("currency", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
	createdAt: integer("created_at", {mode: "timestamp"}).notNull().$defaultFn(() => sql`strftime('%s', 'now')`),
  updatedAt: integer("updated_at", {mode: "timestamp"})
    .notNull()
    .$defaultFn(() => sql`strftime('%s', 'now')`)
    .$onUpdateFn(() => sql`strftime('%s', 'now')`),
});

export const rates = sqliteTable("rate", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  currencyFrom: text("currency_from")
    .notNull()
    .references(() => currencies.id, { onDelete: "restrict" }),
  currencyTo: text("currency_to")
    .notNull()
    .references(() => currencies.id, { onDelete: "restrict" }),
  rate: real("rate").notNull(),
  dateRate: integer("date_rate", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => sql`strftime('%s', 'now')`),
	updatedAt: integer("updated_at", {mode: "timestamp"})
    .notNull()
    .$defaultFn(() => sql`strftime('%s', 'now')`)
    .$onUpdateFn(() => sql`strftime('%s', 'now')`),
});

export const categories = sqliteTable("category", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
	note: text("note"),
  icon: text("icon"),
  color: text("color"),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
	isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
	createdAt: integer("created_at", {mode: "timestamp"}).notNull().$defaultFn(() => sql`strftime('%s', 'now')`),
	updatedAt: integer("updated_at", {mode: "timestamp"})
    .notNull()
    .$defaultFn(() => sql`strftime('%s', 'now')`)
    .$onUpdateFn(() => sql`strftime('%s', 'now')`),
});

export const monthPeriods = sqliteTable("month_period", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  startDate: integer("start_date", {mode: "timestamp"}).notNull(),
  endDate: integer("end_date", {mode: "timestamp"}).notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", {mode: "timestamp"}).notNull().$defaultFn(() => sql`strftime('%s', 'now')`),
  updatedAt: integer("updated_at", {mode: "timestamp"})
    .notNull()
    .$defaultFn(() => sql`strftime('%s', 'now')`)
    .$onUpdateFn(() => sql`strftime('%s', 'now')`),
});

export type InsertMonthPeriod = typeof monthPeriods.$inferInsert;
export type SelectMonthPeriod = typeof monthPeriods.$inferSelect;

export const mustPayTransactions = sqliteTable("must_pay_transaction", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
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
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => sql`strftime('%s', 'now')`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => sql`strftime('%s', 'now')`)
    .$onUpdateFn(() => sql`strftime('%s', 'now')`),
});

export const transactions = sqliteTable("transaction", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  walletId: text("wallet_id")
    .notNull()
    .references(() => wallets.id, { onDelete: "restrict" }),
  toWalletId: text("to_wallet_id").references(() => wallets.id, { onDelete: "restrict" }),
  amount: real("amount").notNull(),
  fee: real("fee").default(0),
  currencyId: text("currency_id")
    .notNull()
    .references(() => currencies.id, { onDelete: "restrict" }),
  date: integer("date", { mode: "timestamp" }).notNull().$defaultFn(() => sql`strftime('%s', 'now')`),
  note: text("note"),
  category: text("category"),
  monthPeriodId: text("month_period_id")
    .notNull()
    .references(() => monthPeriods.id, { onDelete: "restrict" }),
  mustPayTransactionId: text("must_pay_transaction_id").references(
    () => mustPayTransactions.id,
    { onDelete: "set null" }
  ),
  transactionTypeId: text("transaction_type_id").references(
    () => transactionTypes.id,
    { onDelete: "set null" }
  ),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => sql`strftime('%s', 'now')`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => sql`strftime('%s', 'now')`)
    .$onUpdateFn(() => sql`strftime('%s', 'now')`),
});

export const transactionTypes = sqliteTable("transaction_type", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => sql`strftime('%s', 'now')`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => sql`strftime('%s', 'now')`)
    .$onUpdateFn(() => sql`strftime('%s', 'now')`),
});

export const withdrawFees = sqliteTable("withdraw_fee", {
  id: text("id").primaryKey(),
  feeAmount: real("fee_amount").notNull(),
  name: text("name").notNull(),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => sql`strftime('%s', 'now')`),
	updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => sql`strftime('%s', 'now')`)
    .$onUpdateFn(() => sql`strftime('%s', 'now')`),
});

export const logs = sqliteTable("log", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  actionType: text("action_type").$type<ActionType>().notNull(),
  message: text("message").notNull(),
  payload: text("payload", { mode: "json"}),
  response: text("response", { mode: "json"}),
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull().$defaultFn(() => sql`strftime('%s', 'now')`),
});

export const settings = sqliteTable("setting", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  value: text("value"),
  note: text("note"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => sql`strftime('%s', 'now')`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => sql`strftime('%s', 'now')`)
    .$onUpdateFn(() => sql`strftime('%s', 'now')`),
});

// ===== Relations =====
// user (1) -> session (many)
// user (1) -> account (many)
// user (1) -> wallet (many)
// user (1) -> category (many)
// user (1) -> currency (many)
// user (1) -> rate (many)
// user (1) -> month_period (many)
// user (1) -> must_pay_transaction (many)
// user (1) -> transaction (many)
// user (1) -> transaction_type (many)
// user (1) -> settings (many)
// user (1) -> log (many)
export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  wallets: many(wallets),
  categories: many(categories),
  currencies: many(currencies),
  rates: many(rates),
  monthPeriods: many(monthPeriods),
  mustPayTransactions: many(mustPayTransactions),
  transactions: many(transactions),
  transactionTypes: many(transactionTypes),
  settings: many(settings),
  logs: many(logs),
}));

// session (many) -> user (1)
export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

// account (many) -> user (1)
export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const verificationRelations = relations(verification, () => ({}));

// wallet (many) -> user (1)
// wallet (1) -> transaction (many), via walletId
// wallet (1) -> transaction (many), via toWalletId (incoming transfers)
export const walletRelations = relations(wallets, ({ one, many }) => ({
  user: one(user, {
    fields: [wallets.userId],
    references: [user.id],
  }),
  transactions: many(transactions, { relationName: "walletTransactions" }),
  incomingTransactions: many(transactions, { relationName: "toWalletTransactions" }),
}));

// currency (many) -> user (1)
// currency (1) -> transaction (many)
// currency (1) -> must_pay_transaction (many)
// currency (1) -> rate (many), via currencyFrom
// currency (1) -> rate (many), via currencyTo
export const currencyRelations = relations(currencies, ({ one, many }) => ({
  user: one(user, {
    fields: [currencies.userId],
    references: [user.id],
  }),
  transactions: many(transactions),
  mustPayTransactions: many(mustPayTransactions),
  ratesFrom: many(rates, { relationName: "currencyFromRates" }),
  ratesTo: many(rates, { relationName: "currencyToRates" }),
}));

// rate (many) -> user (1)
// rate (many) -> currency (1), via currencyFrom
// rate (many) -> currency (1), via currencyTo
export const rateRelations = relations(rates, ({ one }) => ({
  user: one(user, {
    fields: [rates.userId],
    references: [user.id],
  }),
  currencyFrom: one(currencies, {
    fields: [rates.currencyFrom],
    references: [currencies.id],
    relationName: "currencyFromRates",
  }),
  currencyTo: one(currencies, {
    fields: [rates.currencyTo],
    references: [currencies.id],
    relationName: "currencyToRates",
  }),
}));

// category (many) -> user (1)
// category (1) -> transaction (many)
// category (1) -> must_pay_transaction (many)
export const categoryRelations = relations(categories, ({ one, many }) => ({
  user: one(user, {
    fields: [categories.userId],
    references: [user.id],
  }),
  mustPayTransactions: many(mustPayTransactions),
}));

// month_period (many) -> user (1)
// month_period (1) -> transaction (many)
// month_period (1) -> must_pay_transaction (many)
export const monthPeriodRelations = relations(monthPeriods, ({ one, many }) => ({
  user: one(user, {
    fields: [monthPeriods.userId],
    references: [user.id],
  }),
  transactions: many(transactions),
  mustPayTransactions: many(mustPayTransactions),
}));

// transaction (many) -> user (1)
// transaction (many) -> wallet (1)
// transaction (many) -> wallet (1), for transfers (toWallet)
// transaction (many) -> currency (1)
// transaction (many) -> month_period (1)
// transaction (many) -> must_pay_transaction (1)
// transaction (many) -> transaction_type (1)
export const transactionRelations = relations(transactions, ({ one, many }) => ({
  user: one(user, {
    fields: [transactions.userId],
    references: [user.id],
  }),
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
  monthPeriod: one(monthPeriods, {
    fields: [transactions.monthPeriodId],
    references: [monthPeriods.id],
  }),
  mustPayTransaction: one(mustPayTransactions, {
    fields: [transactions.mustPayTransactionId],
    references: [mustPayTransactions.id],
  }),
  transactionType: one(transactionTypes, {
    fields: [transactions.transactionTypeId],
    references: [transactionTypes.id],
  }),
}));

// must_pay_transaction (many) -> user (1)
// must_pay_transaction (many) -> month_period (1)
// must_pay_transaction (many) -> currency (1)
// must_pay_transaction (many) -> category (1)
// must_pay_transaction (1) -> transaction (many)
export const mustPayTransactionRelations = relations(mustPayTransactions, ({ one, many }) => ({
  user: one(user, {
    fields: [mustPayTransactions.userId],
    references: [user.id],
  }),
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

// transaction_type (many) -> user (1)
// transaction_type (1) -> transaction (many)
export const transactionTypeRelations = relations(transactionTypes, ({ one, many }) => ({
  user: one(user, {
    fields: [transactionTypes.userId],
    references: [user.id],
  }),
  transactions: many(transactions),
}));

// log (many) -> user (1)
export const logRelations = relations(logs, ({ one }) => ({
  user: one(user, {
    fields: [logs.userId],
    references: [user.id],
  }),
}));

// settings (many) -> user (1)
export const settingsRelations = relations(settings, ({ one }) => ({
  user: one(user, {
    fields: [settings.userId],
    references: [user.id],
  }),
}));


// Export types
export type InsertTransaction = typeof transactions.$inferInsert;
export type InsertMustPayTransaction = typeof mustPayTransactions.$inferInsert;
