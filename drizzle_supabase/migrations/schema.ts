import { pgTable, bigint, varchar, unique, timestamp, foreignKey, boolean, uuid } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const reportTypes = pgTable("reportTypes", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "reportTypes_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807 }),
	name: varchar().notNull(),
	description: varchar(),
});

export const secrets = pgTable("secrets", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "secrets_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	name: varchar().notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`(now() AT TIME ZONE 'utc'::text)`),
	deletedOn: timestamp({ mode: 'string' }).default(sql`(now() AT TIME ZONE 'utc'::text)`),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	count: bigint({ mode: "number" }),
	lastRetrieveAt: timestamp({ mode: 'string' }),
}, (table) => [
	unique("secrets_name_key").on(table.name),
]);

export const configures = pgTable("configures", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "configures_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	key: varchar().notNull(),
	value: varchar().notNull(),
	description: varchar(),
});

export const reports = pgTable("reports", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "reports_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	postId: bigint({ mode: "number" }).notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	reportTypeId: bigint({ mode: "number" }),
	reportMessage: varchar(),
	reportIpaddress: varchar(),
	reportDate: timestamp({ mode: 'string' }).default(sql`(now() AT TIME ZONE 'utc'::text)`),
	isProcessed: boolean().default(false),
}, (table) => [
	foreignKey({
			columns: [table.postId],
			foreignColumns: [posts.id],
			name: "reports_postId_fkey"
		}),
	foreignKey({
			columns: [table.reportTypeId],
			foreignColumns: [reportTypes.id],
			name: "reports_reportTypeId_fkey"
		}),
]);

export const posts = pgTable("posts", {
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity({ name: "posts_id_seq", startWith: 1, increment: 1, minValue: 1, maxValue: 9223372036854775807, cache: 1 }),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	secretId: bigint({ mode: "number" }).notNull(),
	title: varchar(),
	text: varchar(),
	isDeleted: boolean().default(false).notNull(),
	ipaddress: varchar(),
	createdAt: timestamp({ mode: 'string' }).default(sql`(now() AT TIME ZONE 'utc'::text)`),
	deletedOn: timestamp({ mode: 'string' }),
	attachments: varchar().array(),
	uuid: uuid().defaultRandom(),
	updatedOn: timestamp({ mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.secretId],
			foreignColumns: [secrets.id],
			name: "posts_secretId_fkey"
		}).onDelete("cascade"),
]);
