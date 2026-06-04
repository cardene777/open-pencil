CREATE TABLE `boards` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`creator_anonymous_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `collaborators` (
	`board_id` text NOT NULL,
	`anonymous_id` text NOT NULL,
	`role` text NOT NULL,
	`added_at` integer NOT NULL,
	`invitation_id` text,
	PRIMARY KEY(`board_id`, `anonymous_id`),
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `collaborators_anonymous_id_idx` ON `collaborators` (`anonymous_id`);--> statement-breakpoint
CREATE INDEX `collaborators_invitation_id_idx` ON `collaborators` (`invitation_id`);--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`board_id` text NOT NULL,
	`sent_to_email_hash` text NOT NULL,
	`role` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`revoked` integer DEFAULT false NOT NULL,
	`jti` text NOT NULL,
	`token` text
);
--> statement-breakpoint
CREATE INDEX `invitations_board_id_idx` ON `invitations` (`board_id`);