import { pgTable, serial, text, boolean, integer, timestamp, } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
export const spacesTable = pgTable("ali_spaces", {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    hostTelegramId: text("host_telegram_id").notNull(),
    hostPseudonym: text("host_pseudonym").notNull(),
    hostAliId: text("host_ali_id").notNull(),
    status: text("status").notNull().default("scheduled"),
    isPrivate: boolean("is_private").notNull().default(false),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
});
export const spaceParticipantsTable = pgTable("ali_space_participants", {
    id: serial("id").primaryKey(),
    spaceId: integer("space_id").notNull(),
    telegramId: text("telegram_id").notNull(),
    pseudonym: text("pseudonym").notNull(),
    aliId: text("ali_id").notNull(),
    role: text("role").notNull().default("listener"),
    isMuted: boolean("is_muted").notNull().default(false),
    raisedHand: boolean("raised_hand").notNull().default(false),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
});
export const spaceSignalsTable = pgTable("ali_space_signals", {
    id: serial("id").primaryKey(),
    spaceId: integer("space_id").notNull(),
    fromTelegramId: text("from_telegram_id").notNull(),
    toTelegramId: text("to_telegram_id").notNull(),
    type: text("type").notNull(),
    payload: text("payload").notNull(),
    processed: boolean("processed").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertSpaceSchema = createInsertSchema(spacesTable).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
