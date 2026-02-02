-- Generation Tags Table for auto-tagging system
CREATE TABLE generation_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  generation_id TEXT NOT NULL REFERENCES generations(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  category TEXT
);

CREATE INDEX idx_generation_tags_generation ON generation_tags(generation_id);
CREATE INDEX idx_generation_tags_tag ON generation_tags(tag);
CREATE INDEX idx_generation_tags_category ON generation_tags(category);
