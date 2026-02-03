import { get_db } from "../db";

export type GenerationStats = {
  total: number;
  today: number;
  today_pst: number;
  this_week: number;
  this_month: number;
  success_rate: number;
  estimated_cost: number;
};

export type PopularComponent = {
  id: string;
  name: string;
  category_id: string;
  usage_count: number;
};

export type DailyGenerations = {
  date: string;
  count: number;
  success: number;
  failed: number;
  estimated_cost: number;
};

export type QueueStats = {
  queued: number;
  processing: number;
  avg_wait_time: number | null;
};

// Estimated cost per image in USD (based on standard AI image generation rates ~0.04)
const COST_PER_IMAGE = 0.04;

export const get_generation_stats = (): GenerationStats => {
  const db = get_db();

  const total = (
    db.prepare("SELECT COUNT(*) as count FROM generations").get() as { count: number }
  ).count;

  const today = (
    db
      .prepare("SELECT COUNT(*) as count FROM generations WHERE date(created_at) = date('now')")
      .get() as { count: number }
  ).count;

  // PST is UTC-8
  const today_pst = (
    db
      .prepare(
        "SELECT COUNT(*) as count FROM generations WHERE date(datetime(created_at, '-8 hours')) = date(datetime('now', '-8 hours'))"
      )
      .get() as { count: number }
  ).count;

  const this_week = (
    db
      .prepare("SELECT COUNT(*) as count FROM generations WHERE created_at >= date('now', '-7 days')")
      .get() as { count: number }
  ).count;

  const this_month = (
    db
      .prepare("SELECT COUNT(*) as count FROM generations WHERE created_at >= date('now', '-30 days')")
      .get() as { count: number }
  ).count;

  const success_count = (
    db
      .prepare("SELECT COUNT(*) as count FROM generations WHERE status = 'completed'")
      .get() as { count: number }
  ).count;

  const failed_count = (
    db.prepare("SELECT COUNT(*) as count FROM generations WHERE status = 'failed'").get() as {
      count: number;
    }
  ).count;

  const total_attempts = success_count + failed_count;
  const success_rate = total_attempts > 0 ? (success_count / total_attempts) * 100 : 100;

  return {
    total,
    today,
    today_pst,
    this_week,
    this_month,
    success_rate: Math.round(success_rate * 10) / 10,
    estimated_cost: total * COST_PER_IMAGE,
  };
};

export const get_popular_components = (limit = 10): PopularComponent[] => {
  const db = get_db();

  const rows = db
    .prepare(
      `
    SELECT
      c.id,
      c.name,
      c.category_id,
      COUNT(us.id) as usage_count
    FROM components c
    LEFT JOIN usage_stats us ON us.component_id = c.id
    GROUP BY c.id
    ORDER BY usage_count DESC
    LIMIT ?
  `
    )
    .all(limit) as PopularComponent[];

  return rows;
};

export const get_daily_generations = (days = 30): DailyGenerations[] => {
  const db = get_db();

  const rows = db
    .prepare(
      `
    WITH RECURSIVE dates(date) AS (
      SELECT date('now', '-' || ? || ' days')
      UNION ALL
      SELECT date(date, '+1 day')
      FROM dates
      WHERE date < date('now')
    )
    SELECT
      dates.date,
      COALESCE(SUM(CASE WHEN g.id IS NOT NULL THEN 1 ELSE 0 END), 0) as count,
      COALESCE(SUM(CASE WHEN g.status = 'completed' THEN 1 ELSE 0 END), 0) as success,
      COALESCE(SUM(CASE WHEN g.status = 'failed' THEN 1 ELSE 0 END), 0) as failed
    FROM dates
    LEFT JOIN generations g ON date(g.created_at) = dates.date
    GROUP BY dates.date
    ORDER BY dates.date ASC
  `
    )
    .all(days - 1) as any[];

  return rows.map(row => ({
    ...row,
    estimated_cost: row.count * COST_PER_IMAGE
  }));
};

export const get_queue_stats = (): QueueStats => {
  const db = get_db();

  const queued = (
    db.prepare("SELECT COUNT(*) as count FROM generation_queue WHERE status = 'queued'").get() as {
      count: number;
    }
  ).count;

  const processing = (
    db
      .prepare("SELECT COUNT(*) as count FROM generation_queue WHERE status = 'processing'")
      .get() as { count: number }
  ).count;

  const avg_wait = db
    .prepare(
      `
    SELECT AVG(
      (julianday(started_at) - julianday(created_at)) * 86400
    ) as avg_seconds
    FROM generation_queue
    WHERE status IN ('completed', 'failed')
    AND started_at IS NOT NULL
    AND created_at >= datetime('now', '-1 hour')
  `
    )
    .get() as { avg_seconds: number | null };

  return {
    queued,
    processing,
    avg_wait_time: avg_wait.avg_seconds ? Math.round(avg_wait.avg_seconds) : null,
  };
};

export const track_component_usage = (component_id: string): void => {
  const db = get_db();
  db.prepare(
    "INSERT INTO usage_stats (event_type, component_id, created_at) VALUES ('component_use', ?, datetime('now'))"
  ).run(component_id);
};
