import { unlink } from "fs/promises";
import path from "path";

import { get_db, generate_id } from "../db";
import { now, paginate, type PaginatedResult } from "../db-helpers";
import type { Generation, GenerationStatus, GenerationWithFavorite } from "../types/database";

type RawGeneration = {
  id: string;
  prompt_json: string;
  image_path: string | null;
  status: GenerationStatus;
  error_message: string | null;
  api_response_text: string | null;
  created_at: string;
  completed_at: string | null;
};

const parse_generation = (row: RawGeneration): Generation => {
  return {
    ...row,
    prompt_json: JSON.parse(row.prompt_json),
  };
};

export const create_generation = (prompt_json: Record<string, unknown>): Generation => {
  const db = get_db();
  const id = generate_id();
  const timestamp = now();

  db.prepare(`
    INSERT INTO generations (id, prompt_json, status, created_at)
    VALUES (?, ?, 'pending', ?)
  `).run(id, JSON.stringify(prompt_json), timestamp);

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
  error_message?: string;
  api_response_text?: string;
  completed_at?: boolean;
};

export const update_generation = (id: string, input: UpdateGenerationInput): Generation | null => {
  const db = get_db();
  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (input.status !== undefined) {
    updates.push("status = ?");
    values.push(input.status);
  }
  if (input.image_path !== undefined) {
    updates.push("image_path = ?");
    values.push(input.image_path);
  }
  if (input.error_message !== undefined) {
    updates.push("error_message = ?");
    values.push(input.error_message);
  }
  if (input.api_response_text !== undefined) {
    updates.push("api_response_text = ?");
    values.push(input.api_response_text);
  }
  if (input.completed_at) {
    updates.push("completed_at = ?");
    values.push(now());
  }

  if (updates.length === 0) return get_generation(id);

  values.push(id);
  db.prepare(`UPDATE generations SET ${updates.join(", ")} WHERE id = ?`).run(...values);

  return get_generation(id);
};

export type ListGenerationsOptions = {
  page?: number;
  limit?: number;
  favorites_only?: boolean;
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

type RawGenerationWithFavorite = RawGeneration & { is_favorite: number };

export const get_generation_with_favorite = (id: string): GenerationWithFavorite | null => {
  const db = get_db();
  const row = db.prepare(`
    SELECT g.*,
           CASE WHEN f.generation_id IS NOT NULL THEN 1 ELSE 0 END as is_favorite
    FROM generations g
    LEFT JOIN favorites f ON g.id = f.generation_id
    WHERE g.id = ?
  `).get(id) as RawGenerationWithFavorite | undefined;

  if (!row) return null;

  return {
    ...parse_generation(row),
    is_favorite: row.is_favorite === 1,
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

  if (options.search) {
    where_clause += " AND g.prompt_json LIKE ?";
    params.push(`%${options.search}%`);
  }

  if (options.tags && options.tags.length > 0) {
    // Filter by tags - generation must have ALL specified tags
    const tag_placeholders = options.tags.map(() => "?").join(", ");
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
           CASE WHEN f.generation_id IS NOT NULL THEN 1 ELSE 0 END as is_favorite
    FROM generations g
    LEFT JOIN favorites f ON g.id = f.generation_id
    WHERE ${where_clause}
    ORDER BY g.created_at ${sort_order}
  `;

  const count_query = `
    SELECT COUNT(*) as count
    FROM generations g
    LEFT JOIN favorites f ON g.id = f.generation_id
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
    const placeholders = generation_ids.map(() => "?").join(", ");
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

  db.prepare("DELETE FROM favorites WHERE generation_id = ?").run(id);
  const result = db.prepare("DELETE FROM generations WHERE id = ?").run(id);

  return result.changes > 0;
};
