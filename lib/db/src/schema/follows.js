import { pgTable, serial, text, boolean, integer, timestamp, unique } from "drizzle-orm/pg-core";
export const followsTable = pgTable("ali_follows", {
    id: serial("id").primaryKey(),
    followerTelegramId: text("follower_telegram_id").notNull(),
    followingTelegramId: text("following_telegram_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    unique("ali_follows_unique_pair").on(t.followerTelegramId, t.followingTelegramId),
]);
export const spaceInvitesTable = pgTable("ali_space_invites", {
    id: serial("id").primaryKey(),
    spaceId: integer("space_id").notNull(),
    inviterTelegramId: text("inviter_telegram_id").notNull(),
    inviteeTelegramId: text("invitee_telegram_id").notNull(),
    role: text("role").notNull().default("listener"),
    seen: boolean("seen").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
    unique("ali_space_invites_unique_pair").on(t.spaceId, t.inviteeTelegramId),
]);
