CREATE TABLE `user_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`reminders_enabled` integer DEFAULT false,
	`reminder_time` text DEFAULT '20:00',
	`weekly_report_enabled` integer DEFAULT true,
	`streak_freeze_per_week` integer DEFAULT 1,
	`created_at` text DEFAULT (datetime('now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_preferences_user_id_unique` ON `user_preferences` (`user_id`);--> statement-breakpoint
ALTER TABLE `habit_completions` ADD `is_freeze_day` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `habits` ADD `current_streak` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `habits` ADD `longest_streak` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `habits` ADD `freezes_used_this_week` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `habits` ADD `last_freeze_reset` text;--> statement-breakpoint
ALTER TABLE `journal_entries` ADD `prompt_id` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `onboarded` integer DEFAULT false;