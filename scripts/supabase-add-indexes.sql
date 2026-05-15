-- ALI Digital Gateway — Performance Indexes
-- Run in: Supabase Dashboard → SQL Editor
-- These indexes speed up the most frequent queries across the app.

-- ali_messages: thread lookups and unread-count filters (most critical)
CREATE INDEX IF NOT EXISTS idx_ali_messages_to_read
  ON ali_messages(to_telegram_id, read_at)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_ali_messages_thread
  ON ali_messages(from_telegram_id, to_telegram_id, created_at);

-- ali_space_participants: join/lookup by space and user
CREATE INDEX IF NOT EXISTS idx_ali_space_participants_space
  ON ali_space_participants(space_id);

CREATE INDEX IF NOT EXISTS idx_ali_space_participants_user
  ON ali_space_participants(telegram_id);

-- ali_follows: follower/following lookups
CREATE INDEX IF NOT EXISTS idx_ali_follows_follower
  ON ali_follows(follower_telegram_id);

CREATE INDEX IF NOT EXISTS idx_ali_follows_following
  ON ali_follows(following_telegram_id);

-- ali_users: pseudonym search (LIKE queries)
CREATE INDEX IF NOT EXISTS idx_ali_users_pseudonym_lower
  ON ali_users(lower(pseudonym));

-- ali_users: leaderboard ordering
CREATE INDEX IF NOT EXISTS idx_ali_users_leaderboard
  ON ali_users(loyalty_points DESC, level DESC);

-- ali_space_signals: pending signal drain on reconnect
CREATE INDEX IF NOT EXISTS idx_ali_space_signals_pending
  ON ali_space_signals(space_id, to_telegram_id, processed)
  WHERE processed = false;
