/**
 * Templates Repository
 *
 * Handles database operations for component templates.
 */

import { get_db } from "@/lib/db";

export type Template = {
  id: string;
  name: string;
  description: string | null;
  component_ids: string[];
  shared_component_ids: string[];
  thumbnail_generation_id: string | null;
  created_at: string;
  updated_at: string;
};

type TemplateRow = {
  id: string;
  name: string;
  description: string | null;
  component_ids: string;
  shared_component_ids: string;
  thumbnail_generation_id: string | null;
  created_at: string;
  updated_at: string;
};

const generate_id = () => `tmpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const row_to_template = (row: TemplateRow): Template => ({
  id: row.id,
  name: row.name,
  description: row.description,
  component_ids: JSON.parse(row.component_ids),
  shared_component_ids: JSON.parse(row.shared_component_ids),
  thumbnail_generation_id: row.thumbnail_generation_id,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

/**
 * Get all templates, sorted by creation date.
 */
export const get_templates = (): Template[] => {
  const db = get_db();
  const rows = db
    .prepare(
      `SELECT * FROM templates ORDER BY created_at DESC`
    )
    .all() as TemplateRow[];
  return rows.map(row_to_template);
};

/**
 * Get a single template by ID.
 */
export const get_template_by_id = (id: string): Template | null => {
  const db = get_db();
  const row = db
    .prepare(`SELECT * FROM templates WHERE id = ?`)
    .get(id) as TemplateRow | undefined;
  return row ? row_to_template(row) : null;
};

/**
 * Create a new template.
 */
export const create_template = (data: {
  name: string;
  description?: string;
  component_ids: string[];
  shared_component_ids: string[];
  thumbnail_generation_id?: string;
}): Template => {
  const db = get_db();
  const id = generate_id();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO templates (id, name, description, component_ids, shared_component_ids, thumbnail_generation_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    data.name,
    data.description ?? null,
    JSON.stringify(data.component_ids),
    JSON.stringify(data.shared_component_ids),
    data.thumbnail_generation_id ?? null,
    now,
    now
  );

  return get_template_by_id(id)!;
};

/**
 * Update an existing template.
 */
export const update_template = (
  id: string,
  data: {
    name?: string;
    description?: string;
    component_ids?: string[];
    shared_component_ids?: string[];
    thumbnail_generation_id?: string | null;
  }
): Template | null => {
  const db = get_db();
  const existing = get_template_by_id(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updates: string[] = ["updated_at = ?"];
  const values: (string | null)[] = [now];

  if (data.name !== undefined) {
    updates.push("name = ?");
    values.push(data.name);
  }
  if (data.description !== undefined) {
    updates.push("description = ?");
    values.push(data.description);
  }
  if (data.component_ids !== undefined) {
    updates.push("component_ids = ?");
    values.push(JSON.stringify(data.component_ids));
  }
  if (data.shared_component_ids !== undefined) {
    updates.push("shared_component_ids = ?");
    values.push(JSON.stringify(data.shared_component_ids));
  }
  if (data.thumbnail_generation_id !== undefined) {
    updates.push("thumbnail_generation_id = ?");
    values.push(data.thumbnail_generation_id);
  }

  values.push(id);

  db.prepare(`UPDATE templates SET ${updates.join(", ")} WHERE id = ?`).run(
    ...values
  );

  return get_template_by_id(id);
};

/**
 * Delete a template.
 */
export const delete_template = (id: string): boolean => {
  const db = get_db();
  const result = db.prepare(`DELETE FROM templates WHERE id = ?`).run(id);
  return result.changes > 0;
};

/**
 * Search templates by name.
 */
export const search_templates = (query: string): Template[] => {
  const db = get_db();
  const rows = db
    .prepare(
      `SELECT * FROM templates WHERE name LIKE ? ORDER BY created_at DESC`
    )
    .all(`%${query}%`) as TemplateRow[];
  return rows.map(row_to_template);
};

/**
 * Export template as JSON.
 */
export const export_template = (id: string): object | null => {
  const template = get_template_by_id(id);
  if (!template) return null;

  return {
    name: template.name,
    description: template.description,
    component_ids: template.component_ids,
    shared_component_ids: template.shared_component_ids,
    exported_at: new Date().toISOString(),
  };
};

/**
 * Import template from JSON.
 */
export const import_template = (data: {
  name: string;
  description?: string;
  component_ids: string[];
  shared_component_ids?: string[];
}): Template => {
  return create_template({
    name: data.name,
    description: data.description,
    component_ids: data.component_ids,
    shared_component_ids: data.shared_component_ids ?? [],
  });
};
