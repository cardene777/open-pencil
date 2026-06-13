CREATE TABLE `internal_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`user_id` text,
	`added_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `internal_users_email_unique` ON `internal_users` (`email`);--> statement-breakpoint
CREATE INDEX `internal_users_user_id_idx` ON `internal_users` (`user_id`);--> statement-breakpoint
CREATE TABLE `pending_internal_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`board_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`invited_by_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`invited_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `pending_internal_invitations_email_idx` ON `pending_internal_invitations` (`email`);--> statement-breakpoint
CREATE INDEX `pending_internal_invitations_board_id_idx` ON `pending_internal_invitations` (`board_id`);