import {
  pgTable,
  serial,
  bigint,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * Mirrors the existing users_activity table in the database.
 * Tracks last_seen timestamp and current quiz level per user.
 * telegram_id is stored as bigint (int8) to match the existing Supabase column.
 */
export const usersActivityTable = pgTable("users_activity", {
  id:               serial("id").primaryKey(),
  telegramId:       bigint("telegram_id", { mode: "number" }).notNull().unique(),
  username:         text("username"),
  currentQuizLevel: integer("current_quiz_level").notNull().default(1),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeen:         timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Tracks ad revenue attribution per user for financial transparency.
 * total_revenue_points = cumulative loyalty points earned from ads.
 * ad_count = number of fully-watched ads.
 */
export const adsRevenueTable = pgTable("ads_revenue", {
  id:                  serial("id").primaryKey(),
  telegramId:          bigint("telegram_id", { mode: "number" }).notNull().unique(),
  totalRevenuePoints:  integer("total_revenue_points").notNull().default(0),
  adCount:             integer("ad_count").notNull().default(0),
  lastAdAt:            timestamp("last_ad_at", { withTimezone: true }),
  updatedAt:           timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type UserActivity = typeof usersActivityTable.$inferSelect;
export type AdsRevenue   = typeof adsRevenueTable.$inferSelect;
