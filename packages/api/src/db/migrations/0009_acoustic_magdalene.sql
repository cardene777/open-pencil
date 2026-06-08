CREATE TABLE `pages` (
	`id` text PRIMARY KEY NOT NULL,
	`board_id` text NOT NULL,
	`name` text NOT NULL,
	`content` text,
	`position` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `pages_board_id_idx` ON `pages` (`board_id`);--> statement-breakpoint
CREATE INDEX `pages_board_id_position_idx` ON `pages` (`board_id`,`position`);--> statement-breakpoint
ALTER TABLE `boards` DROP COLUMN `content`;