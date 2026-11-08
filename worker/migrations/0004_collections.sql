-- Forward only; never rewrites poems or their historical revisions.
CREATE TABLE collections (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, intro TEXT NOT NULL DEFAULT '',
 cover TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
 version INTEGER NOT NULL DEFAULT 1, mutation_id TEXT NOT NULL,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE collection_items (
 collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
 poem_id TEXT NOT NULL REFERENCES poems(id) ON DELETE CASCADE,
 position INTEGER NOT NULL CHECK(position >= 0),
 PRIMARY KEY(collection_id,poem_id), UNIQUE(collection_id,position)
);
CREATE INDEX collection_items_poem ON collection_items(poem_id);
