import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const articlesTable = pgTable("ali_articles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  mediaUrl: text("media_url"),                          // رابط العرض الحالي (proxy أو Supabase)
  supabaseUrl: text("supabase_url"),                    // رابط Supabase الأصلي — احتياطي دائم
  telegramFileId: text("telegram_file_id"),             // file_id في قناة تلغرام بعد الأرشفة
  authorTelegramId: text("author_telegram_id").notNull(),
  authorPseudonym: text("author_pseudonym").notNull(),
  authorAliId: text("author_ali_id").notNull(),
  viewCount:     integer("view_count").notNull().default(0),
  downloadCount: integer("download_count").notNull().default(0),
  shareCount:    integer("share_count").notNull().default(0),
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

export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Article = typeof articlesTable.$inferSelect;
