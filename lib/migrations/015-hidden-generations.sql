CREATE TABLE hidden_generations (
  generation_id TEXT PRIMARY KEY REFERENCES generations(id) ON DELETE CASCADE,
  hidden_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
