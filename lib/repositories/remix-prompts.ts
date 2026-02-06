import { get_db, generate_id } from "../db";
import { now } from "../db-helpers";
import type { SavedRemixPrompt } from "../types/database";

export const list_remix_prompts = (): SavedRemixPrompt[] => {
  const db = get_db();
  return db.prepare("SELECT * FROM saved_remix_prompts ORDER BY updated_at DESC").all() as SavedRemixPrompt[];
};

export const get_remix_prompt = (id: string): SavedRemixPrompt | null => {
  const db = get_db();
  const row = db.prepare("SELECT * FROM saved_remix_prompts WHERE id = ?").get(id) as
    | SavedRemixPrompt
    | undefined;
  return row ?? null;
};

export type CreateRemixPromptInput = {
  name: string;
  instructions: string;
};

export const create_remix_prompt = (input: CreateRemixPromptInput): SavedRemixPrompt => {
  const db = get_db();
  const id = generate_id();
  const timestamp = now();

  db.prepare(
    `INSERT INTO saved_remix_prompts (id, name, instructions, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, input.name, input.instructions, timestamp, timestamp);

  return get_remix_prompt(id)!;
};

export type UpdateRemixPromptInput = {
  name?: string;
  instructions?: string;
};

export const update_remix_prompt = (
  id: string,
  input: UpdateRemixPromptInput
): SavedRemixPrompt | null => {
  const db = get_db();
  const existing = get_remix_prompt(id);
  if (!existing) return null;

  const sql_parts: string[] = [];
  const values: (string | number)[] = [];

  if (input.name !== undefined) {
    sql_parts.push("name = ?");
    values.push(input.name);
  }
  if (input.instructions !== undefined) {
    sql_parts.push("instructions = ?");
    values.push(input.instructions);
  }

  if (sql_parts.length === 0) return existing;

  sql_parts.push("updated_at = ?");
  values.push(now());

  db.prepare(`UPDATE saved_remix_prompts SET ${sql_parts.join(", ")} WHERE id = ?`).run(
    ...values,
    id
  );

  return get_remix_prompt(id);
};

export const delete_remix_prompt = (id: string): boolean => {
  const db = get_db();
  const result = db.prepare("DELETE FROM saved_remix_prompts WHERE id = ?").run(id);
  return result.changes > 0;
};
