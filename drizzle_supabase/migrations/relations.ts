import { relations } from "drizzle-orm/relations";
import { posts, reports, reportTypes, secrets } from "./schema";

export const reportsRelations = relations(reports, ({one}) => ({
	post: one(posts, {
		fields: [reports.postId],
		references: [posts.id]
	}),
	reportType: one(reportTypes, {
		fields: [reports.reportTypeId],
		references: [reportTypes.id]
	}),
}));

export const postsRelations = relations(posts, ({one, many}) => ({
	reports: many(reports),
	secret: one(secrets, {
		fields: [posts.secretId],
		references: [secrets.id]
	}),
}));

export const reportTypesRelations = relations(reportTypes, ({many}) => ({
	reports: many(reports),
}));

export const secretsRelations = relations(secrets, ({many}) => ({
	posts: many(posts),
}));