import { pgTable, serial, text, timestamp, integer, unique } from "drizzle-orm/pg-core";
import { articlesTable } from "./articles.js";

export const articleLikesTable = pgTable("article_likes", {
  id:         serial("id").primaryKey(),
  articleId:  integer("article_id").notNull().references(() => articlesTable.id, { onDelete: "cascade" }),
  telegramId: text("telegram_id").notNull(),
  createdAt:  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => ({ uniq: unique().on(t.articleId, t.telegramId) }));

export const articleCommentsTable = pgTable("article_comments", {
  id:         serial("id").primaryKey(),
  articleId:  integer("article_id").notNull().references(() => articlesTable.id, { onDelete: "cascade" }),
  telegramId: text("telegram_id").notNull(),
  pseudonym:  text("pseudonym").notNull(),
  text:       text("text").notNull(),
  createdAt:  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
