import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
export const articlesTable = pgTable("ali_articles", {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    authorTelegramId: text("author_telegram_id").notNull(),
    authorPseudonym: text("author_pseudonym").notNull(),
    authorAliId: text("author_ali_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
});
export const insertArticleSchema = createInsertSchema(articlesTable).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
