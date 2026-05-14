/**
 * One-time migration script: Replit PostgreSQL → Supabase
 * Run: node scripts/migrate-to-supabase.mjs
 */
import pg from '/home/runner/workspace/node_modules/.pnpm/pg@8.20.0/node_modules/pg/lib/index.js';
const { Pool } = pg;

const PROJECT_REF = 'fgvdbxxggpiukhlintfd';
const DB_PASS = process.env.SUPABASE_DB_PASSWORD;
const LOCAL_URL = process.env.DATABASE_URL;

if (!DB_PASS) { console.error('Missing SUPABASE_DB_PASSWORD'); process.exit(1); }
if (!LOCAL_URL) { console.error('Missing DATABASE_URL'); process.exit(1); }

// ── connections ──────────────────────────────────────────────────────────────
const local = new Pool({ connectionString: LOCAL_URL });
const supa  = new Pool({
  connectionString: `postgresql://postgres.${PROJECT_REF}:${DB_PASS}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20_000,
});

async function run() {
  // 1 — test connections
  console.log('Testing local DB…');
  const lv = await local.query('SELECT current_database()');
  console.log('✓ local:', lv.rows[0].current_database);

  console.log('Testing Supabase (pooler 6543)…');
  const sv = await supa.query('SELECT current_database()');
  console.log('✓ Supabase:', sv.rows[0].current_database);

  // 2 — create all tables on Supabase
  console.log('\nCreating tables…');
  await supa.query(`
    CREATE TABLE IF NOT EXISTS ali_users (
      id                    SERIAL PRIMARY KEY,
      ali_id                TEXT NOT NULL UNIQUE,
      pseudonym             TEXT NOT NULL,
      telegram_id           TEXT NOT NULL UNIQUE,
      telegram_username     TEXT,
      first_name            TEXT,
      last_name             TEXT,
      vault_key             TEXT NOT NULL,
      identity_key          TEXT NOT NULL,
      master_key            TEXT NOT NULL,
      mdd_balance           NUMERIC(20,8) NOT NULL DEFAULT 0,
      rank                  TEXT NOT NULL DEFAULT 'Initiate',
      level                 INTEGER NOT NULL DEFAULT 1,
      keys_confirmed        BOOLEAN NOT NULL DEFAULT FALSE,
      loyalty_points        INTEGER NOT NULL DEFAULT 0,
      role                  TEXT NOT NULL DEFAULT 'member',
      referred_by           TEXT,
      last_ad_reward_at     TIMESTAMPTZ,
      last_quiz_completed_at TIMESTAMPTZ,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ali_follows (
      id                    SERIAL PRIMARY KEY,
      follower_telegram_id  TEXT NOT NULL,
      following_telegram_id TEXT NOT NULL,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (follower_telegram_id, following_telegram_id)
    );

    CREATE TABLE IF NOT EXISTS ali_space_invites (
      id                    SERIAL PRIMARY KEY,
      space_id              INTEGER NOT NULL,
      inviter_telegram_id   TEXT NOT NULL,
      invitee_telegram_id   TEXT NOT NULL,
      role                  TEXT NOT NULL DEFAULT 'listener',
      seen                  BOOLEAN NOT NULL DEFAULT FALSE,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (space_id, invitee_telegram_id)
    );

    CREATE TABLE IF NOT EXISTS ali_spaces (
      id                SERIAL PRIMARY KEY,
      title             TEXT NOT NULL,
      description       TEXT,
      host_telegram_id  TEXT NOT NULL,
      host_pseudonym    TEXT NOT NULL,
      host_ali_id       TEXT NOT NULL,
      status            TEXT NOT NULL DEFAULT 'scheduled',
      is_private        BOOLEAN NOT NULL DEFAULT FALSE,
      scheduled_at      TIMESTAMPTZ,
      started_at        TIMESTAMPTZ,
      ended_at          TIMESTAMPTZ,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ali_space_participants (
      id           SERIAL PRIMARY KEY,
      space_id     INTEGER NOT NULL,
      telegram_id  TEXT NOT NULL,
      pseudonym    TEXT NOT NULL,
      ali_id       TEXT NOT NULL,
      role         TEXT NOT NULL DEFAULT 'listener',
      is_muted     BOOLEAN NOT NULL DEFAULT FALSE,
      raised_hand  BOOLEAN NOT NULL DEFAULT FALSE,
      joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (space_id, telegram_id)
    );

    CREATE TABLE IF NOT EXISTS ali_space_signals (
      id               SERIAL PRIMARY KEY,
      space_id         INTEGER NOT NULL,
      from_telegram_id TEXT NOT NULL,
      to_telegram_id   TEXT NOT NULL,
      type             TEXT NOT NULL,
      payload          TEXT NOT NULL,
      processed        BOOLEAN NOT NULL DEFAULT FALSE,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ali_articles (
      id                  SERIAL PRIMARY KEY,
      title               TEXT NOT NULL,
      body                TEXT NOT NULL,
      author_telegram_id  TEXT NOT NULL,
      author_pseudonym    TEXT NOT NULL,
      author_ali_id       TEXT NOT NULL,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS users_activity (
      id                 SERIAL PRIMARY KEY,
      telegram_id        BIGINT NOT NULL UNIQUE,
      username           TEXT,
      current_quiz_level INTEGER NOT NULL DEFAULT 1,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ads_revenue (
      id                   SERIAL PRIMARY KEY,
      telegram_id          BIGINT NOT NULL UNIQUE,
      total_revenue_points INTEGER NOT NULL DEFAULT 0,
      ad_count             INTEGER NOT NULL DEFAULT 0,
      last_ad_at           TIMESTAMPTZ,
      updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('✓ All tables created');

  // 3 — migrate table by table
  await migrateTable('ali_users', `
    SELECT id, ali_id, pseudonym, telegram_id, telegram_username,
           first_name, last_name, vault_key, identity_key, master_key,
           mdd_balance, rank, level, keys_confirmed, loyalty_points, role,
           referred_by, last_ad_reward_at, last_quiz_completed_at,
           created_at, updated_at
    FROM ali_users ORDER BY id
  `, (r) => `(${[
    r.id, esc(r.ali_id), esc(r.pseudonym), esc(r.telegram_id), esc(r.telegram_username),
    esc(r.first_name), esc(r.last_name), esc(r.vault_key), esc(r.identity_key), esc(r.master_key),
    r.mdd_balance, esc(r.rank), r.level, r.keys_confirmed, r.loyalty_points, esc(r.role),
    esc(r.referred_by), escTs(r.last_ad_reward_at), escTs(r.last_quiz_completed_at),
    escTs(r.created_at), escTs(r.updated_at)
  ].join(',')})`,
  `INSERT INTO ali_users (id,ali_id,pseudonym,telegram_id,telegram_username,first_name,last_name,vault_key,identity_key,master_key,mdd_balance,rank,level,keys_confirmed,loyalty_points,role,referred_by,last_ad_reward_at,last_quiz_completed_at,created_at,updated_at) VALUES`,
  'ON CONFLICT (telegram_id) DO NOTHING');

  await migrateTable('ali_follows', `SELECT * FROM ali_follows ORDER BY id`,
    (r) => `(${[r.id, esc(r.follower_telegram_id), esc(r.following_telegram_id), escTs(r.created_at)].join(',')})`,
    'INSERT INTO ali_follows (id,follower_telegram_id,following_telegram_id,created_at) VALUES',
    'ON CONFLICT DO NOTHING');

  await migrateTable('ali_space_invites', `SELECT * FROM ali_space_invites ORDER BY id`,
    (r) => `(${[r.id, r.space_id, esc(r.inviter_telegram_id), esc(r.invitee_telegram_id), esc(r.role), r.seen, escTs(r.created_at)].join(',')})`,
    'INSERT INTO ali_space_invites (id,space_id,inviter_telegram_id,invitee_telegram_id,role,seen,created_at) VALUES',
    'ON CONFLICT DO NOTHING');

  await migrateTable('ali_spaces', `SELECT * FROM ali_spaces ORDER BY id`,
    (r) => `(${[r.id, esc(r.title), esc(r.description), esc(r.host_telegram_id), esc(r.host_pseudonym), esc(r.host_ali_id), esc(r.status), r.is_private, escTs(r.scheduled_at), escTs(r.started_at), escTs(r.ended_at), escTs(r.created_at), escTs(r.updated_at)].join(',')})`,
    'INSERT INTO ali_spaces (id,title,description,host_telegram_id,host_pseudonym,host_ali_id,status,is_private,scheduled_at,started_at,ended_at,created_at,updated_at) VALUES',
    'ON CONFLICT DO NOTHING');

  await migrateTable('ali_space_signals', `SELECT * FROM ali_space_signals ORDER BY id`,
    (r) => `(${[r.id, r.space_id, esc(r.from_telegram_id), esc(r.to_telegram_id), esc(r.type), esc(r.payload), r.processed, escTs(r.created_at)].join(',')})`,
    'INSERT INTO ali_space_signals (id,space_id,from_telegram_id,to_telegram_id,type,payload,processed,created_at) VALUES',
    'ON CONFLICT DO NOTHING');

  // 4 — reset sequences so new inserts don't conflict
  console.log('\nResetting sequences…');
  const seqTables = ['ali_users','ali_follows','ali_space_invites','ali_spaces','ali_space_participants','ali_space_signals','ali_articles','users_activity','ads_revenue'];
  for (const t of seqTables) {
    await supa.query(`SELECT setval(pg_get_serial_sequence('${t}','id'), COALESCE((SELECT MAX(id) FROM ${t}),0)+1, false)`);
    process.stdout.write(`  ✓ seq ${t}\n`);
  }

  console.log('\n✅ Migration complete!');
}

async function migrateTable(name, selectSql, rowFn, insertPrefix, conflict) {
  const { rows } = await local.query(selectSql);
  if (!rows.length) { console.log(`  ⓘ  ${name}: 0 rows — skipped`); return; }

  // batch in groups of 200
  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const values = chunk.map(rowFn).join(',\n');
    await supa.query(`${insertPrefix}\n${values}\n${conflict}`);
    inserted += chunk.length;
    process.stdout.write(`  ↑ ${name}: ${inserted}/${rows.length}\r`);
  }
  console.log(`  ✓ ${name}: ${rows.length} rows migrated        `);
}

function esc(v) {
  if (v === null || v === undefined) return 'NULL';
  return `'` + String(v).replace(/'/g, "''") + `'`;
}
function escTs(v) {
  if (v === null || v === undefined) return 'NULL';
  return `'${new Date(v).toISOString()}'`;
}

run()
  .then(() => { local.end(); supa.end(); })
  .catch(e => { console.error('\n✗ Migration failed:', e.message); local.end(); supa.end(); process.exit(1); });
