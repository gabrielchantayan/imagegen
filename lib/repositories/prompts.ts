import { get_db, generate_id } from "../db";
import { now } from "../db-helpers";
import { build_update_query } from "../db-query-helpers";
import type { SavedPrompt } from "../types/database";

type RawSavedPrompt = {
  id: string;
  name: string;
  description: string | null;
  prompt_json: string;
  created_at: string;
  updated_at: string;
};

const parse_prompt = (row: RawSavedPrompt): SavedPrompt => {
  return {
    ...row,
    prompt_json: JSON.parse(row.prompt_json),
  };
};

export type ListPromptsOptions = {
  search?: string;
};

export const list_prompts = (options: ListPromptsOptions = {}): SavedPrompt[] => {
  const db = get_db();

  let sql = "SELECT * FROM saved_prompts";
  const params: string[] = [];

  if (options.search) {
    sql += " WHERE name LIKE ? OR description LIKE ?";
    const pattern = `%${options.search}%`;
    params.push(pattern, pattern);
  }

  sql += " ORDER BY updated_at DESC";

  const rows = db.prepare(sql).all(...params) as RawSavedPrompt[];
  return rows.map(parse_prompt);
};

export const get_prompt = (id: string): SavedPrompt | null => {
  const db = get_db();
  const row = db.prepare("SELECT * FROM saved_prompts WHERE id = ?").get(id) as
    | RawSavedPrompt
    | undefined;
  return row ? parse_prompt(row) : null;
};

export type CreatePromptInput = {
  name: string;
  description?: string;
  prompt_json: Record<string, unknown>;
};

export const create_prompt = (input: CreatePromptInput): SavedPrompt => {
  const db = get_db();
  const id = generate_id();
  const timestamp = now();

  db.prepare(
    `
    INSERT INTO saved_prompts (id, name, description, prompt_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `
  ).run(
    id,
    input.name,
    input.description || null,
    JSON.stringify(input.prompt_json),
    timestamp,
    timestamp
  );

  return get_prompt(id)!;
};

export type UpdatePromptInput = {
  name?: string;
  description?: string;
  prompt_json?: Record<string, unknown>;
};

export const update_prompt = (
  id: string,
  input: UpdatePromptInput
): SavedPrompt | null => {
  const db = get_db();
  const existing = get_prompt(id);
  if (!existing) return null;

  const { sql_parts, values } = build_update_query(input, {
    name: "name",
    description: "description",
    prompt_json: { column: "prompt_json", transform: (v) => JSON.stringify(v) },
  });

  if (sql_parts.length === 0) return existing;

  sql_parts.push("updated_at = ?");
  values.push(now());

  db.prepare(`UPDATE saved_prompts SET ${sql_parts.join(", ")} WHERE id = ?`).run(
    ...values,
    id
  );

  return get_prompt(id);
};

export const delete_prompt = (id: string): boolean => {
  const db = get_db();
  const result = db.prepare("DELETE FROM saved_prompts WHERE id = ?").run(id);
  return result.changes > 0;
};
