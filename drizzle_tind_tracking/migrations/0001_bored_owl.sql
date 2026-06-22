ALTER TABLE `category` RENAME COLUMN "is_system" TO "is_default";--> statement-breakpoint
CREATE TABLE `rate` (
	`id` text PRIMARY KEY NOT NULL,
	`currency_from` text NOT NULL,
	`currency_to` text NOT NULL,
	`rate` real NOT NULL,
	`date_rate` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`currency_from`) REFERENCES `currency`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`currency_to`) REFERENCES `currency`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `transaction_type` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `category` ADD `created_at` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `category` ADD `updated_at` integer NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `category_name_unique` ON `category` (`name`);--> statement-breakpoint
ALTER TABLE `currency` ADD `created_at` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `currency` ADD `updated_at` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `month_period` ADD `updated_at` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `transaction` ADD `date` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `transaction` ADD `category` text;--> statement-breakpoint
ALTER TABLE `transaction` ADD `transaction_type_id` text REFERENCES transaction_type(id);--> statement-breakpoint
ALTER TABLE `transaction` DROP COLUMN `type`;--> statement-breakpoint
ALTER TABLE `transaction` DROP COLUMN `timestamp`;--> statement-breakpoint
ALTER TABLE `transaction` DROP COLUMN `category_id`;--> statement-breakpoint
ALTER TABLE `transaction` DROP COLUMN `custom_category`;--> statement-breakpoint
ALTER TABLE `transaction` DROP COLUMN `related_transaction_id`;--> statement-breakpoint
ALTER TABLE `withdraw_fee` ADD `updated_at` integer NOT NULL;