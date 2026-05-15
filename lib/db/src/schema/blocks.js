import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
export const blocksTable = pgTable("ali_user_blocks", {
    id: serial("id").primaryKey(),
    blockerTelegramId: text("blocker_telegram_id").notNull(),
    blockedTelegramId: text("blocked_telegram_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
