import {
  pgTable,
  serial,
  text,
  boolean,
  numeric,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("ali_users", {
  id: serial("id").primaryKey(),
  aliId: text("ali_id").notNull().unique(),
  pseudonym: text("pseudonym").notNull(),
  telegramId: text("telegram_id").notNull().unique(),
  telegramUsername: text("telegram_username"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  vaultKey: text("vault_key").notNull(),
  identityKey: text("identity_key").notNull(),
  masterKey: text("master_key").notNull(),
  mddBalance: numeric("mdd_balance", { precision: 20, scale: 8 })
    .notNull()
    .default("0"),
  rank: text("rank").notNull().default("Initiate"),
  level: integer("level").notNull().default(1),
  keysConfirmed: boolean("keys_confirmed").notNull().default(false),
  loyaltyPoints: integer("loyalty_points").notNull().default(0),
  role: text("role").notNull().default("member"),
  civicRole: text("civic_role"),
  photoUrl:  text("photo_url"),
  referredBy: text("referred_by"),
  lastSeenArticleId: integer("last_seen_article_id"),
  isBanned: boolean("is_banned").notNull().default(false),
  banReason: text("ban_reason"),
  lastAdRewardAt: timestamp("last_ad_reward_at", { withTimezone: true }),
  lastQuizCompletedAt: timestamp("last_quiz_completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
