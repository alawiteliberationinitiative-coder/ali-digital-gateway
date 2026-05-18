import { pgTable, serial, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";

export const quizProgressTable = pgTable("quiz_progress", {
  id:                serial("id").primaryKey(),
  telegramId:        text("telegram_id").notNull().unique(),
  currentStage:      integer("current_stage").notNull().default(1),
  stageCorrectCount: integer("stage_correct_count").notNull().default(0),
  totalCorrect:      integer("total_correct").notNull().default(0),
  totalAnswered:     integer("total_answered").notNull().default(0),
  accuracyScore:     integer("accuracy_score").notNull().default(0),
  questionPool:      jsonb("question_pool").$type<number[]>(),
  poolIndex:         integer("pool_index").notNull().default(0),
  retryQueue:        jsonb("retry_queue").$type<number[]>(),
  correctIds:        jsonb("correct_ids").$type<number[]>(),
  createdAt:         timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:         timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
                       .$onUpdate(() => new Date()),
});

export type QuizProgress = typeof quizProgressTable.$inferSelect;
