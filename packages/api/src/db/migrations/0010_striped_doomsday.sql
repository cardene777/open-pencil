CREATE TABLE `board_documents` (
	`board_id` text PRIMARY KEY NOT NULL,
	`bytes` text NOT NULL,
	`size` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`updated_by_user_id` text,
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `board_documents_updated_at_idx` ON `board_documents` (`updated_at`);