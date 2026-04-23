ALTER TABLE `users` ADD `is_premium` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `premium_until` text;