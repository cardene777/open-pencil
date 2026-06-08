ALTER TABLE `users` ADD `access_level` text DEFAULT 'invited-only' NOT NULL;
--> statement-breakpoint
UPDATE `users` SET `access_level` = 'full' WHERE LOWER(`email`) LIKE '%@jfet.co.jp';
