import { pgTable, serial, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";

export const followsTable = pgTable("ali_follows", {
  id: serial("id").primaryKey(),
  followerTelegramId: text("follower_telegram_id").notNull(),
  followingTelegramId: text("following_telegram_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const spaceInvitesTable = pgTable("ali_space_invites", {
  id: serial("id").primaryKey(),
  spaceId: integer("space_id").notNull(),
  inviterTelegramId: text("inviter_telegram_id").notNull(),
  inviteeTelegramId: text("invitee_telegram_id").notNull(),
  role: text("role").notNull().default("listener"),
  seen: boolean("seen").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Follow = typeof followsTable.$inferSelect;
export type SpaceInvite = typeof spaceInvitesTable.$inferSelect;
