CREATE TABLE `board_pins` (
	`user_id` text NOT NULL,
	`board_id` text NOT NULL,
	`pinned_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `board_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `board_pins_user_id_idx` ON `board_pins` (`user_id`);--> statement-breakpoint
CREATE INDEX `board_pins_board_id_idx` ON `board_pins` (`board_id`);--> statement-breakpoint
CREATE TABLE `board_previews` (
	`board_id` text PRIMARY KEY NOT NULL,
	`data_url` text NOT NULL,
	`size` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`updated_by_user_id` text,
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`updated_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `board_previews_updated_at_idx` ON `board_previews` (`updated_at`);