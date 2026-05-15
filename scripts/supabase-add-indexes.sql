-- ALI Digital Gateway — Performance Indexes
-- Run in: Supabase Dashboard → SQL Editor
-- These indexes speed up the most frequent queries across the app.

-- messages: thread lookups and unread-count filters (most critical)
CREATE INDEX IF NOT EXISTS idx_messages_to_read
  ON messages(to_telegram_id, read_at)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_thread
  ON messages(from_telegram_id, to_telegram_id, created_at);

-- space_participants: join/lookup by space and user
CREATE INDEX IF NOT EXISTS idx_space_participants_space
  ON space_participants(space_id);

CREATE INDEX IF NOT EXISTS idx_space_participants_user
  ON space_participants(telegram_id);

-- follows: follower/following lookups
CREATE INDEX IF NOT EXISTS idx_follows_follower
  ON follows(follower_telegram_id);

CREATE INDEX IF NOT EXISTS idx_follows_following
  ON follows(following_telegram_id);

-- ali_users: pseudonym search (LIKE queries)
CREATE INDEX IF NOT EXISTS idx_users_pseudonym_lower
  ON ali_users(lower(pseudonym));

-- ali_users: leaderboard ordering
CREATE INDEX IF NOT EXISTS idx_users_leaderboard
  ON ali_users(loyalty_points DESC, level DESC);

-- space_signals: pending signal drain on reconnect
CREATE INDEX IF NOT EXISTS idx_space_signals_pending
  ON space_signals(space_id, to_telegram_id, processed)
  WHERE processed = false;
