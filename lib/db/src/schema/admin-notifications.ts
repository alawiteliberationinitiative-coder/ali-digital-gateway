import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const adminNotificationsTable = pgTable("admin_notifications", {
  id:        serial("id").primaryKey(),
  type:      text("type").notNull(),
  refId:     text("ref_id"),
  refTitle:  text("ref_title"),
  actorId:   text("actor_id"),
  actorName: text("actor_name"),
  seen:      boolean("seen").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AdminNotification = typeof adminNotificationsTable.$inferSelect;
