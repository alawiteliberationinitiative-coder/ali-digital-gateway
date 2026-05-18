import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const docSubmissionsTable = pgTable("doc_submissions", {
  id:           serial("id").primaryKey(),
  telegramId:   text("telegram_id").notNull(),
  fileId:       text("file_id").notNull(),
  formType:     text("form_type").notNull().default("unknown"),
  status:       text("status").notNull().default("pending"),
  pointsAmount: integer("points_amount").notNull(),
  reviewedBy:   text("reviewed_by"),
  reviewedAt:   timestamp("reviewed_at", { withTimezone: true }),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DocSubmission = typeof docSubmissionsTable.$inferSelect;
