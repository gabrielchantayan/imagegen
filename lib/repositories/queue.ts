import { get_db } from "../db";
import { paginate, type PaginatedResult } from "../db-helpers";
import type { QueueItem, QueueStatus } from "../types/database";

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

export type QueueItemWithPosition = QueueItem & {
  generation_id: string | null;
  position: number | null;
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

export type QueueMetrics = {
  total_queued: number;
  total_processing: number;
  avg_wait_time_seconds: number | null;
  success_rate_1h: number | null;
  completed_1h: number;
  failed_1h: number;
};

export const get_queue_metrics = (): QueueMetrics => {
  const db = get_db();

  const counts = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM generation_queue WHERE status = 'queued') as total_queued,
      (SELECT COUNT(*) FROM generation_queue WHERE status = 'processing') as total_processing
  `).get() as { total_queued: number; total_processing: number };

  const avg_wait = db.prepare(`
    SELECT AVG((julianday(started_at) - julianday(created_at)) * 86400) as avg_wait
    FROM generation_queue
    WHERE started_at IS NOT NULL
    AND created_at >= datetime('now', '-1 hour')
  `).get() as { avg_wait: number | null };

  const success_stats = db.prepare(`
    SELECT
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
      COUNT(*) as total
    FROM generation_queue
    WHERE status IN ('completed', 'failed')
    AND completed_at >= datetime('now', '-1 hour')
  `).get() as { completed: number; failed: number; total: number };

  const success_rate = success_stats.total > 0
    ? (success_stats.completed / success_stats.total) * 100
    : null;

  return {
    total_queued: counts.total_queued,
    total_processing: counts.total_processing,
    avg_wait_time_seconds: avg_wait.avg_wait,
    success_rate_1h: success_rate,
    completed_1h: success_stats.completed,
    failed_1h: success_stats.failed,
  };
};

export const get_active_queue_items = (): QueueItemWithPosition[] => {
  const db = get_db();

  type RawQueueItemWithPosition = RawQueueItem & { position: number | null };

  const rows = db.prepare(`
    SELECT q.*,
      CASE WHEN q.status = 'queued' THEN (
        SELECT COUNT(*) FROM generation_queue
        WHERE status = 'queued' AND created_at <= q.created_at
      ) ELSE NULL END as position
    FROM generation_queue q
    WHERE q.status IN ('queued', 'processing')
    ORDER BY CASE q.status WHEN 'processing' THEN 0 ELSE 1 END, q.created_at
  `).all() as RawQueueItemWithPosition[];

  return rows.map((row) => ({
    ...parse_queue_item(row),
    position: row.position,
  }));
};

export type QueueHistoryOptions = {
  page?: number;
  limit?: number;
  status_filter?: "completed" | "failed" | "all";
};

export type QueueHistoryItem = QueueItem & {
  generation_id: string | null;
  duration_seconds: number | null;
  image_path: string | null;
};

export const get_queue_history = (
  options: QueueHistoryOptions = {}
): PaginatedResult<QueueHistoryItem> => {
  const db = get_db();
  const status_filter = options.status_filter ?? "all";

  let where_clause = "q.status IN ('completed', 'failed')";
  const params: (string | number)[] = [];

  if (status_filter === "completed") {
    where_clause = "q.status = 'completed'";
  } else if (status_filter === "failed") {
    where_clause = "q.status = 'failed'";
  }

  type RawHistoryItem = RawQueueItem & {
    duration_seconds: number | null;
    image_path: string | null;
  };

  const query = `
    SELECT q.*,
      CASE WHEN q.completed_at IS NOT NULL AND q.created_at IS NOT NULL
        THEN (julianday(q.completed_at) - julianday(q.created_at)) * 86400
        ELSE NULL END as duration_seconds,
      g.image_path
    FROM generation_queue q
    LEFT JOIN generations g ON q.generation_id = g.id
    WHERE ${where_clause}
    ORDER BY q.completed_at DESC
  `;

  const count_query = `
    SELECT COUNT(*) as count
    FROM generation_queue q
    WHERE ${where_clause}
  `;

  const result = paginate<RawHistoryItem>(query, count_query, params, {
    page: options.page,
    limit: options.limit ?? 20,
  });

  return {
    ...result,
    items: result.items.map((row) => ({
      ...parse_queue_item(row),
      duration_seconds: row.duration_seconds,
      image_path: row.image_path,
    })),
  };
};
