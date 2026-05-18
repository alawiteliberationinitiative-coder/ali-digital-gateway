import { logger } from "./logger.js";

const SUPABASE_URL = (process.env.SUPABASE_URL ?? "")
  .replace(/\/rest\/v1\/?$/, "")
  .replace(/\/$/, "");
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

async function execDdl(ddl: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_ddl`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ ddl }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`exec_ddl failed (${res.status}): ${text}`);
  }
}

export async function runMigrations(): Promise<void> {
  try {
    await execDdl(`
      CREATE TABLE IF NOT EXISTS quiz_progress (
        id                   SERIAL PRIMARY KEY,
        telegram_id          TEXT NOT NULL UNIQUE,
        current_stage        INTEGER NOT NULL DEFAULT 1,
        stage_correct_count  INTEGER NOT NULL DEFAULT 0,
        total_correct        INTEGER NOT NULL DEFAULT 0,
        total_answered       INTEGER NOT NULL DEFAULT 0,
        accuracy_score       INTEGER NOT NULL DEFAULT 0,
        question_pool        JSONB,
        pool_index           INTEGER NOT NULL DEFAULT 0,
        retry_queue          JSONB,
        correct_ids          JSONB,
        created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    logger.info("quiz_progress migration: OK");
  } catch (err) {
    logger.warn(
      { err },
      "quiz_progress migration skipped — run scripts/supabase-rpc.sql in Supabase Dashboard to enable auto-migration",
    );
  }
}
