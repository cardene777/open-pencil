DROP TABLE `team_members`;--> statement-breakpoint
DROP TABLE `teams`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_boards` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`creator_anonymous_id` text NOT NULL,
	`creator_user_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`creator_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_boards`("id", "name", "creator_anonymous_id", "creator_user_id", "created_at", "updated_at") SELECT "id", "name", "creator_anonymous_id", "creator_user_id", "created_at", "updated_at" FROM `boards`;--> statement-breakpoint
DROP TABLE `boards`;--> statement-breakpoint
ALTER TABLE `__new_boards` RENAME TO `boards`;--> statement-breakpoint
PRAGMA foreign_keys=ON;