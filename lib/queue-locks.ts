import { get_db, generate_id } from "./db";
import { now } from "./db-helpers";

// Lock timeout in minutes - locks older than this are considered stale
const LOCK_TIMEOUT_MINUTES = 5;

// Heartbeat interval - how often to update the lock heartbeat
export const HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds

export type QueueLock = {
  id: string;
  queue_item_id: string;
  locked_at: string;
  heartbeat_at: string;
};

/**
 * Attempts to acquire a lock on a queue item.
 * Returns the lock if successful, null if item is already locked.
 */
export const acquire_lock = (queue_item_id: string): QueueLock | null => {
  const db = get_db();
  const lock_id = generate_id();
  const timestamp = now();

  try {
    // Use INSERT OR IGNORE to handle race conditions atomically
    const result = db.prepare(`
      INSERT OR IGNORE INTO queue_locks (id, queue_item_id, locked_at, heartbeat_at)
      VALUES (?, ?, ?, ?)
    `).run(lock_id, queue_item_id, timestamp, timestamp);

    if (result.changes === 0) {
      // Lock already exists - check if it's stale
      const existing = db.prepare(`
        SELECT * FROM queue_locks WHERE queue_item_id = ?
      `).get(queue_item_id) as QueueLock | undefined;

      if (existing && is_lock_stale(existing.heartbeat_at)) {
        // Stale lock - try to take it over
        const take_over_result = db.prepare(`
          UPDATE queue_locks
          SET id = ?, locked_at = ?, heartbeat_at = ?
          WHERE queue_item_id = ? AND heartbeat_at = ?
        `).run(lock_id, timestamp, timestamp, queue_item_id, existing.heartbeat_at);

        if (take_over_result.changes > 0) {
          return {
            id: lock_id,
            queue_item_id,
            locked_at: timestamp,
            heartbeat_at: timestamp,
          };
        }
      }

      return null; // Could not acquire lock
    }

    return {
      id: lock_id,
      queue_item_id,
      locked_at: timestamp,
      heartbeat_at: timestamp,
    };
  } catch {
    return null;
  }
};

/**
 * Releases a lock by ID.
 */
export const release_lock = (lock_id: string): void => {
  const db = get_db();
  db.prepare("DELETE FROM queue_locks WHERE id = ?").run(lock_id);
};

/**
 * Releases a lock by queue item ID.
 */
export const release_lock_for_item = (queue_item_id: string): void => {
  const db = get_db();
  db.prepare("DELETE FROM queue_locks WHERE queue_item_id = ?").run(queue_item_id);
};

/**
 * Updates the heartbeat timestamp for a lock to indicate it's still active.
 */
export const update_heartbeat = (lock_id: string): void => {
  const db = get_db();
  db.prepare("UPDATE queue_locks SET heartbeat_at = ? WHERE id = ?").run(now(), lock_id);
};

/**
 * Gets the count of active (non-stale) locks.
 */
export const get_active_lock_count = (): number => {
  const db = get_db();
  const cutoff = get_stale_cutoff_time();

  const result = db.prepare(`
    SELECT COUNT(*) as count FROM queue_locks WHERE heartbeat_at > ?
  `).get(cutoff) as { count: number };

  return result.count;
};

/**
 * Checks if a queue item has an active lock.
 */
export const is_item_locked = (queue_item_id: string): boolean => {
  const db = get_db();
  const cutoff = get_stale_cutoff_time();

  const result = db.prepare(`
    SELECT COUNT(*) as count FROM queue_locks
    WHERE queue_item_id = ? AND heartbeat_at > ?
  `).get(queue_item_id, cutoff) as { count: number };

  return result.count > 0;
};

/**
 * Resets all stale processing items back to queued status.
 * Should be called on server startup.
 */
export const reset_stale_processing_items = (): number => {
  const db = get_db();
  const cutoff = get_stale_cutoff_time();

  // Find all stale locks and get their queue item IDs
  const stale_locks = db.prepare(`
    SELECT queue_item_id FROM queue_locks WHERE heartbeat_at <= ?
  `).all(cutoff) as { queue_item_id: string }[];

  // Also find processing items without any lock (orphaned from previous crash)
  const orphaned_processing = db.prepare(`
    SELECT id FROM generation_queue
    WHERE status = 'processing'
    AND id NOT IN (SELECT queue_item_id FROM queue_locks)
  `).all() as { id: string }[];

  const items_to_reset = [
    ...stale_locks.map((l) => l.queue_item_id),
    ...orphaned_processing.map((o) => o.id),
  ];

  if (items_to_reset.length === 0) {
    return 0;
  }

  // Reset in a transaction
  const reset_count = db.transaction(() => {
    let count = 0;

    for (const item_id of items_to_reset) {
      // Reset queue item to queued
      const queue_result = db.prepare(`
        UPDATE generation_queue SET status = 'queued', started_at = NULL
        WHERE id = ? AND status = 'processing'
      `).run(item_id);

      if (queue_result.changes > 0) {
        count++;

        // Also reset the associated generation if any
        db.prepare(`
          UPDATE generations SET status = 'pending'
          WHERE id IN (SELECT generation_id FROM generation_queue WHERE id = ?)
          AND status = 'generating'
        `).run(item_id);
      }

      // Remove stale lock
      db.prepare("DELETE FROM queue_locks WHERE queue_item_id = ?").run(item_id);
    }

    return count;
  })();

  return reset_count;
};

/**
 * Cleans up all stale locks (without resetting queue items).
 */
export const cleanup_stale_locks = (): number => {
  const db = get_db();
  const cutoff = get_stale_cutoff_time();

  const result = db.prepare("DELETE FROM queue_locks WHERE heartbeat_at <= ?").run(cutoff);
  return result.changes;
};

// Helper functions

const is_lock_stale = (heartbeat_at: string): boolean => {
  const cutoff = get_stale_cutoff_time();
  return heartbeat_at <= cutoff;
};

const get_stale_cutoff_time = (): string => {
  const cutoff_date = new Date(Date.now() - LOCK_TIMEOUT_MINUTES * 60 * 1000);
  return cutoff_date.toISOString().replace("T", " ").slice(0, 19);
};
