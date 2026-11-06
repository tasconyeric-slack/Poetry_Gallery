-- Forward-only: keep every committed predecessor, including restored versions.
ALTER TABLE poems ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
CREATE TABLE poem_revisions (
 poem_id TEXT NOT NULL REFERENCES poems(id) ON DELETE CASCADE,
 version INTEGER NOT NULL, title TEXT NOT NULL, author TEXT, body TEXT NOT NULL,
 genre TEXT NOT NULL, note TEXT, composed_on TEXT, status TEXT NOT NULL,
 cover_id TEXT, saved_at TEXT NOT NULL, PRIMARY KEY(poem_id,version)
);
CREATE TRIGGER poem_revision_before_update BEFORE UPDATE ON poems
WHEN NEW.version > OLD.version
BEGIN
 INSERT INTO poem_revisions(poem_id,version,title,author,body,genre,note,composed_on,status,cover_id,saved_at)
 VALUES(OLD.id,OLD.version,OLD.title,OLD.author,OLD.body,OLD.genre,OLD.note,OLD.composed_on,OLD.status,OLD.cover_id,OLD.updated_at);
END;
