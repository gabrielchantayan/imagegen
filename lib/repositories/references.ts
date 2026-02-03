import { unlink } from "fs/promises";
import path from "path";

import { get_db, generate_id } from "../db";
import { now } from "../db-helpers";
import type {
  ReferencePhoto,
  ReferencePhotoWithComponents,
} from "../types/database";

type RawReferencePhoto = {
  id: string;
  name: string;
  image_path: string;
  original_filename: string | null;
  mime_type: string;
  created_at: string;
};

export const list_references = (): ReferencePhoto[] => {
  const db = get_db();
  return db
    .prepare("SELECT * FROM reference_photos ORDER BY created_at DESC")
    .all() as RawReferencePhoto[];
};

export const get_reference = (id: string): ReferencePhotoWithComponents | null => {
  const db = get_db();
  const row = db
    .prepare("SELECT * FROM reference_photos WHERE id = ?")
    .get(id) as RawReferencePhoto | undefined;

  if (!row) return null;

  const component_ids = db
    .prepare(
      "SELECT component_id FROM component_reference_defaults WHERE reference_photo_id = ?"
    )
    .all(id) as { component_id: string }[];

  return {
    ...row,
    component_ids: component_ids.map((c) => c.component_id),
  };
};

export const get_references_by_ids = (ids: string[]): ReferencePhoto[] => {
  if (ids.length === 0) return [];

  const db = get_db();
  const placeholders = ids.map(() => "?").join(", ");
  return db
    .prepare(`SELECT * FROM reference_photos WHERE id IN (${placeholders})`)
    .all(...ids) as RawReferencePhoto[];
};

export type CreateReferenceInput = {
  name: string;
  image_path: string;
  original_filename?: string;
  mime_type: string;
};

export const create_reference = (input: CreateReferenceInput): ReferencePhoto => {
  const db = get_db();
  const id = generate_id();
  const timestamp = now();

  db.prepare(`
    INSERT INTO reference_photos (id, name, image_path, original_filename, mime_type, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.name,
    input.image_path,
    input.original_filename ?? null,
    input.mime_type,
    timestamp
  );

  return get_reference(id)!;
};

export const update_reference = (
  id: string,
  updates: { name?: string }
): ReferencePhoto | null => {
  const db = get_db();
  const existing = get_reference(id);
  if (!existing) return null;

  if (updates.name !== undefined) {
    db.prepare("UPDATE reference_photos SET name = ? WHERE id = ?").run(
      updates.name,
      id
    );
  }

  return get_reference(id);
};

export const delete_reference = async (id: string): Promise<boolean> => {
  const db = get_db();
  const reference = get_reference(id);

  if (!reference) return false;

  // Delete file from disk
  if (reference.image_path) {
    const file_path = path.join(process.cwd(), "public", reference.image_path);
    try {
      await unlink(file_path);
    } catch {
      // File may not exist, continue
    }
  }

  // Delete component defaults (cascade should handle this, but be explicit)
  db.prepare(
    "DELETE FROM component_reference_defaults WHERE reference_photo_id = ?"
  ).run(id);

  // Delete reference
  const result = db.prepare("DELETE FROM reference_photos WHERE id = ?").run(id);

  return result.changes > 0;
};

export const get_component_default_references = (
  component_id: string
): ReferencePhoto[] => {
  const db = get_db();
  return db
    .prepare(`
      SELECT rp.* FROM reference_photos rp
      INNER JOIN component_reference_defaults crd ON rp.id = crd.reference_photo_id
      WHERE crd.component_id = ?
      ORDER BY rp.created_at DESC
    `)
    .all(component_id) as RawReferencePhoto[];
};

export const get_component_default_reference_ids = (
  component_id: string
): string[] => {
  const db = get_db();
  const rows = db
    .prepare(
      "SELECT reference_photo_id FROM component_reference_defaults WHERE component_id = ?"
    )
    .all(component_id) as { reference_photo_id: string }[];

  return rows.map((r) => r.reference_photo_id);
};

export const attach_reference_to_component = (
  component_id: string,
  reference_photo_id: string
): boolean => {
  const db = get_db();

  try {
    db.prepare(`
      INSERT INTO component_reference_defaults (component_id, reference_photo_id)
      VALUES (?, ?)
    `).run(component_id, reference_photo_id);
    return true;
  } catch {
    // Already exists or foreign key constraint failed
    return false;
  }
};

export const detach_reference_from_component = (
  component_id: string,
  reference_photo_id: string
): boolean => {
  const db = get_db();
  const result = db
    .prepare(
      "DELETE FROM component_reference_defaults WHERE component_id = ? AND reference_photo_id = ?"
    )
    .run(component_id, reference_photo_id);

  return result.changes > 0;
};

export const get_all_component_reference_defaults = (): Map<string, string[]> => {
  const db = get_db();
  const rows = db
    .prepare("SELECT component_id, reference_photo_id FROM component_reference_defaults")
    .all() as { component_id: string; reference_photo_id: string }[];

  const map = new Map<string, string[]>();
  for (const row of rows) {
    if (!map.has(row.component_id)) {
      map.set(row.component_id, []);
    }
    map.get(row.component_id)!.push(row.reference_photo_id);
  }

  return map;
};
