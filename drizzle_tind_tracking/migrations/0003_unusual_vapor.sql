ALTER TABLE `transaction` RENAME COLUMN "notes" TO "note";--> statement-breakpoint
ALTER TABLE `transaction` ADD `user_id` text NOT NULL REFERENCES user(id);--> statement-breakpoint
DROP INDEX `category_name_unique`;--> statement-breakpoint
ALTER TABLE `category` ADD `note` text;--> statement-breakpoint
ALTER TABLE `currency` ADD `user_id` text NOT NULL REFERENCES user(id);--> statement-breakpoint
ALTER TABLE `must_pay_transaction` ADD `user_id` text NOT NULL REFERENCES user(id);--> statement-breakpoint
ALTER TABLE `rate` ADD `user_id` text NOT NULL REFERENCES user(id);