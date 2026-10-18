-- Poetry Gallery ONLY: Cloudflare D1 (SQLite). No Supabase dependency.
CREATE TABLE IF NOT EXISTS poems (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK(length(title) BETWEEN 1 AND 120),
  body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 30000),
  genre TEXT NOT NULL DEFAULT '其他' CHECK(genre IN ('五言','七言','词','其他')),
  note TEXT,
  composed_on TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
  cover_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT
);
CREATE INDEX IF NOT EXISTS poems_public_idx ON poems(status,published_at DESC);
CREATE TABLE IF NOT EXISTS covers (
  id TEXT PRIMARY KEY,
  poem_id TEXT NOT NULL REFERENCES poems(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK(media_type IN ('image/jpeg','image/png','image/webp')),
  base64 TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS owner_sessions (
  token_hash TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS owner_sessions_expires_idx ON owner_sessions(expires_at);
