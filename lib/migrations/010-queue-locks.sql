-- Queue locks table for crash-safe processing
-- Replaces in-memory processing flag with DB-based locking

CREATE TABLE IF NOT EXISTS queue_locks (
  id TEXT PRIMARY KEY,
  queue_item_id TEXT NOT NULL UNIQUE,
  locked_at TEXT NOT NULL,
  heartbeat_at TEXT NOT NULL,
  FOREIGN KEY (queue_item_id) REFERENCES generation_queue(id) ON DELETE CASCADE
);

-- Index for efficient stale lock queries
CREATE INDEX idx_queue_locks_heartbeat ON queue_locks(heartbeat_at);
