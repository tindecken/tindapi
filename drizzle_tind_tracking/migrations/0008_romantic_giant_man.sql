ALTER TABLE `log` RENAME COLUMN "metadata" TO "payload";--> statement-breakpoint
ALTER TABLE `log` ADD `response` text;--> statement-breakpoint
ALTER TABLE `must_pay_transaction` DROP COLUMN `receive_wallet_id`;