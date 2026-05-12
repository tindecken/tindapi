CREATE TABLE `log` (
	`id` text PRIMARY KEY NOT NULL,
	`log` text NOT NULL,
	`created_on` text DEFAULT (current_timestamp) NOT NULL
);
