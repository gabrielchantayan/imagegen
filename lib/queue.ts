import { get_db, generate_id } from "./db";
import { now } from "./db-helpers";
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
};

const parse_queue_item = (row: RawQueueItem): QueueItem & { generation_id: string | null } => {
  return {
    ...row,
    prompt_json: JSON.parse(row.prompt_json),
    generation_id: row.generation_id,
  };
};

export const enqueue = (
  prompt_json: Record<string, unknown>,
  generation_id: string
): QueueItem & { generation_id: string } => {
  const db = get_db();
  const id = generate_id();
  const timestamp = now();

  db.prepare(`
    INSERT INTO generation_queue (id, prompt_json, generation_id, status, created_at)
    VALUES (?, ?, ?, 'queued', ?)
  `).run(id, JSON.stringify(prompt_json), generation_id, timestamp);

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
