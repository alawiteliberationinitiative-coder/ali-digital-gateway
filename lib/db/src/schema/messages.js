import { pgTable, bigserial, text, timestamp } from "drizzle-orm/pg-core";
export const messagesTable = pgTable("ali_messages", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    fromTelegramId: text("from_telegram_id").notNull(),
    toTelegramId: text("to_telegram_id").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp("read_at", { withTimezone: true }),
});
