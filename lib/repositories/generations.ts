import { get_db, generate_id } from "../db";
import { now, paginate, type PaginatedResult } from "../db-helpers";
import type { Generation, GenerationStatus } from "../types/database";

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
