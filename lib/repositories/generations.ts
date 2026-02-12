import { unlink } from "fs/promises";
import path from "path";

import { get_db, generate_id } from "../db";
import { now, paginate, type PaginatedResult } from "../db-helpers";
import { build_update_query, build_sql_placeholders } from "../db-query-helpers";
import type { Generation, GenerationStatus, GenerationWithFavorite, ComponentUsed } from "../types/database";

type RawGeneration = {
  id: string;
  prompt_json: string;
  image_path: string | null;
  pre_swap_image_path: string | null;
  status: GenerationStatus;
  error_message: string | null;
  api_response_text: string | null;
  created_at: string;
  completed_at: string | null;
  reference_photo_ids: string | null;
  inline_reference_paths: string | null;
  used_fallback: number;
  face_swap_failed: number;
  components_used: string | null;
  parent_id: string | null;
  edit_instructions: string | null;
};

const parse_generation = (row: RawGeneration): Generation => {
  return {
    ...row,
    prompt_json: JSON.parse(row.prompt_json),
    reference_photo_ids: row.reference_photo_ids ? JSON.parse(row.reference_photo_ids) : null,
    inline_reference_paths: row.inline_reference_paths ? JSON.parse(row.inline_reference_paths) : null,
    used_fallback: row.used_fallback === 1,
    face_swap_failed: row.face_swap_failed === 1,
    components_used: row.components_used ? JSON.parse(row.components_used) : null,
    parent_id: row.parent_id,
    edit_instructions: row.edit_instructions,
  };
};

export type CreateGenerationOptions = {
  reference_photo_ids?: string[];
  components_used?: ComponentUsed[];
  inline_reference_paths?: string[];
  parent_id?: string;
  edit_instructions?: string;
};

export const create_generation = (
  prompt_json: Record<string, unknown>,
  reference_photo_ids?: string[],
  components_used?: ComponentUsed[],
  inline_reference_paths?: string[],
  options?: { parent_id?: string; edit_instructions?: string }
): Generation => {
  const db = get_db();
  const id = generate_id();
  const timestamp = now();

  db.prepare(`
    INSERT INTO generations (id, prompt_json, status, created_at, reference_photo_ids, inline_reference_paths, components_used, parent_id, edit_instructions)
    VALUES (?, ?, 'pending', ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    JSON.stringify(prompt_json),
    timestamp,
    reference_photo_ids && reference_photo_ids.length > 0 ? JSON.stringify(reference_photo_ids) : null,
    inline_reference_paths && inline_reference_paths.length > 0 ? JSON.stringify(inline_reference_paths) : null,
    components_used && components_used.length > 0 ? JSON.stringify(components_used) : null,
    options?.parent_id || null,
    options?.edit_instructions || null
  );

  return get_generation(id)!;
};

export const get_generation = (id: string): Generation | null => {
  const db = get_db();
  const row = db.prepare("SELECT * FROM generations WHERE id = ?").get(id) as RawGeneration | undefined;
  return row ? parse_generation(row) : null;
};

export type UpdateGenerationInput = {
  status?: GenerationStatus;
  image_path?: string;
  pre_swap_image_path?: string;
  error_message?: string;
  api_response_text?: string;
  completed_at?: boolean;
  used_fallback?: boolean;
  face_swap_failed?: boolean;
};

export const update_generation = (id: string, input: UpdateGenerationInput): Generation | null => {
  const db = get_db();

  const { sql_parts, values } = build_update_query(input, {
    status: "status",
    image_path: "image_path",
    pre_swap_image_path: "pre_swap_image_path",
    error_message: "error_message",
    api_response_text: "api_response_text",
    completed_at: { column: "completed_at", transform: (v) => v ? now() : null },
    used_fallback: { column: "used_fallback", transform: (v) => v ? 1 : 0 },
    face_swap_failed: { column: "face_swap_failed", transform: (v) => v ? 1 : 0 },
  });

  if (sql_parts.length === 0) return get_generation(id);

  db.prepare(`UPDATE generations SET ${sql_parts.join(", ")} WHERE id = ?`).run(...values, id);

  return get_generation(id);
};

export type ListGenerationsOptions = {
  page?: number;
  limit?: number;
  favorites_only?: boolean;
  show_hidden?: boolean;
  search?: string;
  tags?: string[];
  date_from?: string;
  date_to?: string;
  sort?: "newest" | "oldest";
};

export const list_generations = (options: ListGenerationsOptions = {}): PaginatedResult<Generation> => {
  let where_clause = "1=1";
  const params: (string | number | null)[] = [];

  if (options.favorites_only) {
    where_clause += " AND g.id IN (SELECT generation_id FROM favorites)";
  }

  if (options.search) {
    where_clause += " AND g.prompt_json LIKE ?";
    params.push(`%${options.search}%`);
  }

  const query = `
    SELECT g.* FROM generations g
    WHERE ${where_clause}
    ORDER BY g.created_at DESC
  `;

  const count_query = `
    SELECT COUNT(*) as count FROM generations g
    WHERE ${where_clause}
  `;

  const result = paginate<RawGeneration>(query, count_query, params, {
    page: options.page,
    limit: options.limit,
  });

  return {
    ...result,
    items: result.items.map(parse_generation),
  };
};

type RawGenerationWithFavorite = RawGeneration & { is_favorite: number; is_hidden: number };

export const get_generation_with_favorite = (id: string): GenerationWithFavorite | null => {
  const db = get_db();
  const row = db.prepare(`
    SELECT g.*,
           CASE WHEN f.generation_id IS NOT NULL THEN 1 ELSE 0 END as is_favorite,
           CASE WHEN h.generation_id IS NOT NULL THEN 1 ELSE 0 END as is_hidden
    FROM generations g
    LEFT JOIN favorites f ON g.id = f.generation_id
    LEFT JOIN hidden_generations h ON g.id = h.generation_id
    WHERE g.id = ?
  `).get(id) as RawGenerationWithFavorite | undefined;

  if (!row) return null;

  return {
    ...parse_generation(row),
    is_favorite: row.is_favorite === 1,
    is_hidden: row.is_hidden === 1,
  };
};

export const list_generations_with_favorites = (
  options: ListGenerationsOptions = {}
): PaginatedResult<GenerationWithFavorite> => {
  let where_clause = "g.status = 'completed'";
  const params: (string | number | null)[] = [];

  if (options.favorites_only) {
    where_clause += " AND f.generation_id IS NOT NULL";
  }

  // Hidden filter: by default exclude hidden items, when show_hidden is true show only hidden items
  if (options.show_hidden) {
    where_clause += " AND h.generation_id IS NOT NULL";
  } else {
    where_clause += " AND h.generation_id IS NULL";
  }

  if (options.search) {
    where_clause += " AND g.prompt_json LIKE ?";
    params.push(`%${options.search}%`);
  }

  if (options.tags && options.tags.length > 0) {
    // Filter by tags - generation must have ALL specified tags
    const tag_placeholders = build_sql_placeholders(options.tags.length);
    where_clause += ` AND g.id IN (
      SELECT generation_id FROM generation_tags
      WHERE tag IN (${tag_placeholders})
      GROUP BY generation_id
      HAVING COUNT(DISTINCT tag) = ?
    )`;
    params.push(...options.tags, options.tags.length);
  }

  if (options.date_from) {
    where_clause += " AND date(g.created_at) >= date(?)";
    params.push(options.date_from);
  }

  if (options.date_to) {
    where_clause += " AND date(g.created_at) <= date(?)";
    params.push(options.date_to);
  }

  const sort_order = options.sort === "oldest" ? "ASC" : "DESC";

  const query = `
    SELECT g.*,
           CASE WHEN f.generation_id IS NOT NULL THEN 1 ELSE 0 END as is_favorite,
           CASE WHEN h.generation_id IS NOT NULL THEN 1 ELSE 0 END as is_hidden
    FROM generations g
    LEFT JOIN favorites f ON g.id = f.generation_id
    LEFT JOIN hidden_generations h ON g.id = h.generation_id
    WHERE ${where_clause}
    ORDER BY g.created_at ${sort_order}
  `;

  const count_query = `
    SELECT COUNT(*) as count
    FROM generations g
    LEFT JOIN favorites f ON g.id = f.generation_id
    LEFT JOIN hidden_generations h ON g.id = h.generation_id
    WHERE ${where_clause}
  `;

  const result = paginate<RawGenerationWithFavorite>(query, count_query, params, {
    page: options.page,
    limit: options.limit ?? 24,
  });

  // Fetch tags for these generations
  const generation_ids = result.items.map((i) => i.id);
  const tags_map = new Map<string, { id: number; tag: string; category: string | null }[]>();

  if (generation_ids.length > 0) {
    const db = get_db();
    const placeholders = build_sql_placeholders(generation_ids.length);
    const tags = db
      .prepare(
        `SELECT * FROM generation_tags WHERE generation_id IN (${placeholders})`
      )
      .all(...generation_ids) as {
      id: number;
      generation_id: string;
      tag: string;
      category: string | null;
    }[];

    for (const tag of tags) {
      if (!tags_map.has(tag.generation_id)) {
        tags_map.set(tag.generation_id, []);
      }
      tags_map.get(tag.generation_id)!.push({
        id: tag.id,
        tag: tag.tag,
        category: tag.category,
      });
    }
  }

  return {
    ...result,
    items: result.items.map((row) => ({
      ...parse_generation(row),
      is_favorite: row.is_favorite === 1,
      is_hidden: row.is_hidden === 1,
      tags: tags_map.get(row.id) || [],
    })),
  };
};

export const toggle_favorite = (generation_id: string): boolean => {
  const db = get_db();

  const existing = db.prepare(
    "SELECT 1 FROM favorites WHERE generation_id = ?"
  ).get(generation_id);

  if (existing) {
    db.prepare("DELETE FROM favorites WHERE generation_id = ?").run(generation_id);
    return false;
  } else {
    db.prepare(
      "INSERT INTO favorites (generation_id, created_at) VALUES (?, ?)"
    ).run(generation_id, now());
    return true;
  }
};

export const set_favorite = (generation_id: string, is_favorite: boolean): boolean => {
  const db = get_db();

  const existing = db.prepare(
    "SELECT 1 FROM favorites WHERE generation_id = ?"
  ).get(generation_id);

  if (is_favorite && !existing) {
    db.prepare(
      "INSERT INTO favorites (generation_id, created_at) VALUES (?, ?)"
    ).run(generation_id, now());
  } else if (!is_favorite && existing) {
    db.prepare("DELETE FROM favorites WHERE generation_id = ?").run(generation_id);
  }

  return is_favorite;
};

export const toggle_hidden = (generation_id: string): boolean => {
  const db = get_db();

  const existing = db.prepare(
    "SELECT 1 FROM hidden_generations WHERE generation_id = ?"
  ).get(generation_id);

  if (existing) {
    db.prepare("DELETE FROM hidden_generations WHERE generation_id = ?").run(generation_id);
    return false;
  } else {
    db.prepare(
      "INSERT INTO hidden_generations (generation_id, hidden_at) VALUES (?, ?)"
    ).run(generation_id, now());
    return true;
  }
};

export const set_hidden = (generation_id: string, is_hidden: boolean): boolean => {
  const db = get_db();

  const existing = db.prepare(
    "SELECT 1 FROM hidden_generations WHERE generation_id = ?"
  ).get(generation_id);

  if (is_hidden && !existing) {
    db.prepare(
      "INSERT INTO hidden_generations (generation_id, hidden_at) VALUES (?, ?)"
    ).run(generation_id, now());
  } else if (!is_hidden && existing) {
    db.prepare("DELETE FROM hidden_generations WHERE generation_id = ?").run(generation_id);
  }

  return is_hidden;
};

export const delete_generation = async (id: string): Promise<boolean> => {
  const db = get_db();
  const generation = get_generation(id);

  if (!generation) return false;

  if (generation.image_path) {
    const file_path = path.join(process.cwd(), "public", generation.image_path);
    try {
      await unlink(file_path);
    } catch {
      // File may not exist, continue
    }
  }

  if (generation.pre_swap_image_path) {
    const file_path = path.join(process.cwd(), "public", generation.pre_swap_image_path);
    try {
      await unlink(file_path);
    } catch {
      // File may not exist, continue
    }
  }

  // Update children to point to this generation's parent (preserves lineage chain)
  // If deleting B in chain A -> B -> C, the chain becomes A -> C
  db.prepare("UPDATE generations SET parent_id = ? WHERE parent_id = ?").run(
    generation.parent_id,
    id
  );

  // Clear remix_source_id references in queue table
  db.prepare("UPDATE generation_queue SET remix_source_id = NULL WHERE remix_source_id = ?").run(id);

  db.prepare("DELETE FROM favorites WHERE generation_id = ?").run(id);
  db.prepare("DELETE FROM hidden_generations WHERE generation_id = ?").run(id);
  db.prepare("DELETE FROM generation_tags WHERE generation_id = ?").run(id);
  const result = db.prepare("DELETE FROM generations WHERE id = ?").run(id);

  return result.changes > 0;
};

// Lineage queries for remix feature

export type GenerationLineage = {
  ancestors: Generation[];
  current: Generation;
  children: Generation[];
};

export const get_generation_lineage = (id: string): GenerationLineage | null => {
  const current = get_generation(id);
  if (!current) return null;

  const ancestors: Generation[] = [];
  const children: Generation[] = [];

  // Walk up the parent chain to find all ancestors (only completed with images)
  let parent_id = current.parent_id;
  while (parent_id) {
    const parent = get_generation(parent_id);
    if (!parent) break;
    // Only include completed generations with images in lineage
    if (parent.status === "completed" && parent.image_path) {
      ancestors.unshift(parent); // Add to beginning so root is first
    }
    parent_id = parent.parent_id;
  }

  // Find direct children (only completed with images)
  const db = get_db();
  const child_rows = db.prepare(
    "SELECT * FROM generations WHERE parent_id = ? AND status = 'completed' AND image_path IS NOT NULL ORDER BY created_at ASC"
  ).all(id) as RawGeneration[];

  for (const row of child_rows) {
    children.push(parse_generation(row));
  }

  return { ancestors, current, children };
};

export const get_generation_children = (id: string): Generation[] => {
  const db = get_db();
  const rows = db.prepare(
    "SELECT * FROM generations WHERE parent_id = ? AND status = 'completed' AND image_path IS NOT NULL ORDER BY created_at ASC"
  ).all(id) as RawGeneration[];

  return rows.map(parse_generation);
};

export const update_generation_image = (
  id: string,
  image_path: string,
  edit_instructions: string,
  pre_remix_image_path?: string
): Generation | null => {
  const db = get_db();

  if (pre_remix_image_path) {
    db.prepare(`
      UPDATE generations
      SET image_path = ?, edit_instructions = ?, pre_swap_image_path = ?
      WHERE id = ?
    `).run(image_path, edit_instructions, pre_remix_image_path, id);
  } else {
    db.prepare(`
      UPDATE generations
      SET image_path = ?, edit_instructions = ?
      WHERE id = ?
    `).run(image_path, edit_instructions, id);
  }

  return get_generation(id);
};
