import { get_db, generate_id } from "./db";
import { now } from "./db-helpers";
import { release_lock_for_item } from "./queue-locks";
import type { QueueItem, QueueStatus } from "./types/database";

const MAX_CONCURRENT = 5;

type RawQueueItem = {
  id: string;
  prompt_json: string;
  generation_id: string | null;
  status: QueueStatus;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  reference_photo_ids: string | null;
  inline_reference_paths: string | null;
  google_search: number;
  safety_override: number;
};

const parse_queue_item = (row: RawQueueItem): QueueItem & { generation_id: string | null } => {
  return {
    ...row,
    prompt_json: JSON.parse(row.prompt_json),
    generation_id: row.generation_id,
    reference_photo_ids: row.reference_photo_ids ? JSON.parse(row.reference_photo_ids) : null,
    inline_reference_paths: row.inline_reference_paths ? JSON.parse(row.inline_reference_paths) : null,
    google_search: row.google_search === 1,
    safety_override: row.safety_override === 1,
  };
};

type EnqueueOptions = {
  reference_photo_ids?: string[];
  inline_reference_paths?: string[];
  google_search?: boolean;
  safety_override?: boolean;
};

export const enqueue = (
  prompt_json: Record<string, unknown>,
  generation_id: string,
  options?: EnqueueOptions
): QueueItem & { generation_id: string } => {
  const db = get_db();
  const id = generate_id();
  const timestamp = now();

  db.prepare(`
    INSERT INTO generation_queue (id, prompt_json, generation_id, status, created_at, reference_photo_ids, inline_reference_paths, google_search, safety_override)
    VALUES (?, ?, ?, 'queued', ?, ?, ?, ?, ?)
  `).run(
    id,
    JSON.stringify(prompt_json),
    generation_id,
    timestamp,
    options?.reference_photo_ids && options.reference_photo_ids.length > 0 ? JSON.stringify(options.reference_photo_ids) : null,
    options?.inline_reference_paths && options.inline_reference_paths.length > 0 ? JSON.stringify(options.inline_reference_paths) : null,
    options?.google_search ? 1 : 0,
    options?.safety_override ? 1 : 0
  );

  return get_queue_item(id)! as QueueItem & { generation_id: string };
};

export const get_queue_item = (id: string): (QueueItem & { generation_id: string | null }) | null => {
  const db = get_db();
  const row = db.prepare("SELECT * FROM generation_queue WHERE id = ?").get(id) as RawQueueItem | undefined;
  return row ? parse_queue_item(row) : null;
};

export type QueueStatusInfo = {
  active: number;
  queued: number;
  position: number | null;
};

export const get_queue_status = (item_id?: string): QueueStatusInfo => {
  const db = get_db();

  const active = (
    db.prepare(`
      SELECT COUNT(*) as count FROM generation_queue WHERE status = 'processing'
    `).get() as { count: number }
  ).count;

  const queued = (
    db.prepare(`
      SELECT COUNT(*) as count FROM generation_queue WHERE status = 'queued'
    `).get() as { count: number }
  ).count;

  let position: number | null = null;
  if (item_id) {
    const item = get_queue_item(item_id);
    if (item && item.status === "queued") {
      position = (
        db.prepare(`
          SELECT COUNT(*) as count FROM generation_queue
          WHERE status = 'queued' AND created_at <= ?
        `).get(item.created_at) as { count: number }
      ).count;
    } else if (item && item.status === "processing") {
      position = 0;
    }
  }

  return { active, queued, position };
};

export const get_next_in_queue = (): (QueueItem & { generation_id: string | null }) | null => {
  const db = get_db();

  const { active } = get_queue_status();
  if (active >= MAX_CONCURRENT) {
    return null;
  }

  const row = db.prepare(`
    SELECT * FROM generation_queue
    WHERE status = 'queued'
    ORDER BY created_at ASC
    LIMIT 1
  `).get() as RawQueueItem | undefined;

  return row ? parse_queue_item(row) : null;
};

export const update_queue_status = (
  id: string,
  status: QueueStatus,
  options?: { started_at?: boolean; completed_at?: boolean }
): void => {
  const db = get_db();
  const updates: string[] = ["status = ?"];
  const values: (string | number | null)[] = [status];

  if (options?.started_at) {
    updates.push("started_at = ?");
    values.push(now());
  }

  if (options?.completed_at) {
    updates.push("completed_at = ?");
    values.push(now());
  }

  values.push(id);

  db.prepare(`UPDATE generation_queue SET ${updates.join(", ")} WHERE id = ?`).run(...values);
};

export const cleanup_queue = (): void => {
  const db = get_db();

  db.prepare(`
    DELETE FROM generation_queue
    WHERE status IN ('completed', 'failed')
    AND id NOT IN (
      SELECT id FROM generation_queue
      WHERE status IN ('completed', 'failed')
      ORDER BY completed_at DESC
      LIMIT 100
    )
  `).run();
};

export type DeleteQueueItemResult = {
  success: boolean;
  error?: string;
};

export const delete_queue_item = (id: string): DeleteQueueItemResult => {
  const db = get_db();
  const item = get_queue_item(id);

  if (!item) {
    return { success: false, error: "Queue item not found" };
  }

  if (item.status === "completed" || item.status === "failed") {
    return { success: false, error: "Cannot delete completed or failed items" };
  }

  try {
    db.transaction(() => {
      // Release any lock on this item (for processing items)
      release_lock_for_item(id);

      // Update the linked generation to failed status
      if (item.generation_id) {
        db.prepare(`
          UPDATE generations
          SET status = 'failed', error_message = 'Cancelled by user'
          WHERE id = ? AND status IN ('pending', 'generating')
        `).run(item.generation_id);
      }

      // Delete the queue item
      db.prepare("DELETE FROM generation_queue WHERE id = ?").run(id);
    })();

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete queue item"
    };
  }
};
