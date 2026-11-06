-- Additive metadata migration; existing works remain unattributed until supplied.
ALTER TABLE poems ADD COLUMN author TEXT CHECK(author IS NULL OR length(author) <= 120);
