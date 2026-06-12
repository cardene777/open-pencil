ALTER TABLE `collaborators` ADD `user_id` text REFERENCES users(id);--> statement-breakpoint
CREATE INDEX `collaborators_user_id_idx` ON `collaborators` (`user_id`);