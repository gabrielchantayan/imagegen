import type { SQLQueryBindings } from 'bun:sqlite';
import { get_db, generate_id } from '../db';
import { now } from '../db-helpers';
import type { Component, Category } from '../types/database';

// Internal raw type for DB rows (data is stored as JSON string)
type RawComponent = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  data: string;
  thumbnail_path: string | null;
  created_at: string;
  updated_at: string;
};

const parse_component = (row: RawComponent): Component => {
  return {
    ...row,
    data: JSON.parse(row.data),
  };
};

// Get all categories
export const get_categories = (): Category[] => {
  const db = get_db();
  return db.prepare('SELECT * FROM categories ORDER BY sort_order').all() as Category[];
};

// Get components by category
export const get_components_by_category = (category_id: string): Component[] => {
  const db = get_db();
  const rows = db.prepare(`
    SELECT * FROM components
    WHERE category_id = ?
    ORDER BY updated_at DESC
  `).all(category_id) as RawComponent[];

  return rows.map(parse_component);
};

// Get all components
export const get_all_components = (): Component[] => {
  const db = get_db();
  const rows = db.prepare(`
    SELECT * FROM components ORDER BY category_id, updated_at DESC
  `).all() as RawComponent[];

  return rows.map(parse_component);
};

// Get single component
export const get_component = (id: string): Component | null => {
  const db = get_db();
  const row = db.prepare('SELECT * FROM components WHERE id = ?').get(id) as RawComponent | undefined;
  return row ? parse_component(row) : null;
};

// Create component input
export type CreateComponentInput = {
  category_id: string;
  name: string;
  description?: string;
  data: Record<string, unknown>;
};

// Create component
export const create_component = (input: CreateComponentInput): Component => {
  const db = get_db();
  const id = generate_id();
  const timestamp = now();

  db.prepare(`
    INSERT INTO components (id, category_id, name, description, data, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, input.category_id, input.name, input.description ?? null, JSON.stringify(input.data), timestamp, timestamp);

  return get_component(id)!;
};

// Update component input
export type UpdateComponentInput = {
  name?: string;
  description?: string;
  data?: Record<string, unknown>;
  thumbnail_path?: string;
};

// Update component
export const update_component = (id: string, input: UpdateComponentInput): Component | null => {
  const db = get_db();
  const existing = get_component(id);
  if (!existing) return null;

  const updates: string[] = [];
  const values: SQLQueryBindings[] = [];

  if (input.name !== undefined) {
    updates.push('name = ?');
    values.push(input.name);
  }
  if (input.description !== undefined) {
    updates.push('description = ?');
    values.push(input.description);
  }
  if (input.data !== undefined) {
    updates.push('data = ?');
    values.push(JSON.stringify(input.data));
  }
  if (input.thumbnail_path !== undefined) {
    updates.push('thumbnail_path = ?');
    values.push(input.thumbnail_path);
  }

  if (updates.length === 0) return existing;

  updates.push('updated_at = ?');
  values.push(now());
  values.push(id);

  db.prepare(`UPDATE components SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  return get_component(id);
};

// Delete component
export const delete_component = (id: string): boolean => {
  const db = get_db();
  const result = db.prepare('DELETE FROM components WHERE id = ?').run(id);
  return result.changes > 0;
};

// Search components
export const search_components = (query: string, category_id?: string): Component[] => {
  const db = get_db();
  const pattern = `%${query}%`;

  let sql = `
    SELECT * FROM components
    WHERE (name LIKE ? OR description LIKE ?)
  `;
  const params: string[] = [pattern, pattern];

  if (category_id) {
    sql += ' AND category_id = ?';
    params.push(category_id);
  }

  sql += ' ORDER BY updated_at DESC LIMIT 50';

  const rows = db.prepare(sql).all(...params) as RawComponent[];
  return rows.map(parse_component);
};
