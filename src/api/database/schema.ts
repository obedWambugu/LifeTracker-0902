import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Users
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  onboarded: integer("onboarded", { mode: "boolean" }).default(false),
  isPremium: integer("is_premium", { mode: "boolean" }).default(false),
  premiumUntil: text("premium_until"), // ISO date string, null = not premium
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

// User Preferences
export const userPreferences = sqliteTable("user_preferences", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id).unique(),
  remindersEnabled: integer("reminders_enabled", { mode: "boolean" }).default(false),
  reminderTime: text("reminder_time").default("20:00"), // HH:MM
  weeklyReportEnabled: integer("weekly_report_enabled", { mode: "boolean" }).default(true),
  streakFreezePerWeek: integer("streak_freeze_per_week").default(1),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// Habits
export const habits = sqliteTable("habits", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull().default("Other"),
  frequency: text("frequency").notNull().default("daily"),
  targetDays: text("target_days"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  freezesUsedThisWeek: integer("freezes_used_this_week").default(0),
  lastFreezeReset: text("last_freeze_reset"), // YYYY-MM-DD (Monday)
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// Habit Completions
export const habitCompletions = sqliteTable("habit_completions", {
  id: text("id").primaryKey(),
  habitId: text("habit_id").notNull().references(() => habits.id),
  userId: text("user_id").notNull().references(() => users.id),
  date: text("date").notNull(),
  isFreezeDay: integer("is_freeze_day", { mode: "boolean" }).default(false),
  completedAt: text("completed_at").default(sql`(datetime('now'))`),
});

// Expenses
export const expenses = sqliteTable("expenses", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  amount: real("amount").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  date: text("date").notNull(),
  isRecurring: integer("is_recurring", { mode: "boolean" }).default(false),
  recurringFrequency: text("recurring_frequency"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// Budgets
export const budgets = sqliteTable("budgets", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  category: text("category").notNull(),
  amount: real("amount").notNull(),
  month: text("month").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

// Journal Entries
export const journalEntries = sqliteTable("journal_entries", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  title: text("title"),
  content: text("content").notNull(),
  mood: text("mood").notNull().default("neutral"),
  tags: text("tags"),
  promptId: integer("prompt_id"), // reference to prompt used
  createdAt: text("created_at").default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});
