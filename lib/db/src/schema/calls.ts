import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const presenceTable = pgTable("ali_presence", {
  telegramId: text("telegram_id").primaryKey(),
  context:    text("context").notNull().default("app"),
  updatedAt:  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const callsTable = pgTable("ali_calls", {
  id:         serial("id").primaryKey(),
  callerId:   text("caller_id").notNull(),
  calleeId:   text("callee_id").notNull(),
  status:     text("status").notNull().default("ringing"),
  createdAt:  timestamp("created_at",  { withTimezone: true }).notNull().defaultNow(),
  answeredAt: timestamp("answered_at", { withTimezone: true }),
  endedAt:    timestamp("ended_at",    { withTimezone: true }),
});

export const callSignalsTable = pgTable("ali_call_signals", {
  id:        serial("id").primaryKey(),
  callId:    text("call_id").notNull(),
  fromId:    text("from_id").notNull(),
  toId:      text("to_id").notNull(),
  type:      text("type").notNull(),
  payload:   text("payload").notNull(),
  processed: boolean("processed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
