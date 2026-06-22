ALTER TABLE `month_period` ADD `user_id` text NOT NULL REFERENCES user(id);--> statement-breakpoint
ALTER TABLE `must_pay_transaction` DROP COLUMN `sort_order`;