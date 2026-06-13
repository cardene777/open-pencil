CREATE TABLE `board_document_updates` (
	`id` text PRIMARY KEY NOT NULL,
	`board_id` text NOT NULL,
	`update` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` integer NOT NULL,
	`created_by_user_id` text,
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `board_document_updates_board_id_idx` ON `board_document_updates` (`board_id`);--> statement-breakpoint
CREATE INDEX `board_document_updates_created_at_idx` ON `board_document_updates` (`created_at`);--> statement-breakpoint
CREATE TABLE `board_document_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`board_id` text NOT NULL,
	`state` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` integer NOT NULL,
	`label` text,
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `board_document_versions_board_id_idx` ON `board_document_versions` (`board_id`);--> statement-breakpoint
CREATE INDEX `board_document_versions_created_at_idx` ON `board_document_versions` (`created_at`);