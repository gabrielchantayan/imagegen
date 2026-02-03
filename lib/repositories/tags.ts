import { get_db } from "../db";
import type { ComponentUsed } from "../types/database";

export type GenerationTag = {
  id: number;
  generation_id: string;
  tag: string;
  category: string | null;
};

export type TagWithCount = {
  tag: string;
  category: string | null;
  count: number;
};

// Extract tags from prompt JSON
// Format: category:value (e.g., "char:elena", "scene:beach")
export const extract_tags_from_prompt = (
  prompt_json: Record<string, unknown>
): { tag: string; category: string }[] => {
  const tags: { tag: string; category: string }[] = [];

  const normalize = (value: string): string => {
    return value.toLowerCase().replace(/\s+/g, "-").slice(0, 50);
  };

  // Handle component-based structure (has "name" property)
  const component_mappings: Record<string, string> = {
    characters: "char",
    physical_traits: "trait",
    jewelry: "jewelry",
    wardrobe: "wardrobe",
    wardrobe_tops: "top",
    wardrobe_bottoms: "bottom",
    wardrobe_footwear: "footwear",
    poses: "pose",
    scenes: "scene",
    backgrounds: "bg",
    camera: "camera",
    ban_lists: "ban",
  };

  for (const [key, prefix] of Object.entries(component_mappings)) {
    const value = prompt_json[key];
    if (value && typeof value === "object" && "name" in value) {
      const name = (value as { name: string }).name;
      if (name) {
        tags.push({
          tag: `${prefix}:${normalize(name)}`,
          category: key,
        });
      }
    }
  }

  // Handle direct prompt structure (subject, wardrobe, pose, etc.)
  const subject = prompt_json.subject as Record<string, unknown> | undefined;
  if (subject) {
    // Extract species
    if (typeof subject.species === "string" && subject.species) {
      tags.push({ tag: `species:${normalize(subject.species)}`, category: "subject" });
    }
    // Extract ethnicity
    if (typeof subject.ethnicity === "string" && subject.ethnicity) {
      tags.push({ tag: `ethnicity:${normalize(subject.ethnicity)}`, category: "subject" });
    }
    // Extract type (character archetype)
    if (typeof subject.type === "string" && subject.type) {
      // Extract key words from type
      const type_lower = subject.type.toLowerCase();
      if (type_lower.includes("woman")) tags.push({ tag: "gender:woman", category: "subject" });
      if (type_lower.includes("man") && !type_lower.includes("woman")) {
        tags.push({ tag: "gender:man", category: "subject" });
      }
    }
  }

  // Extract wardrobe items
  const wardrobe = prompt_json.wardrobe as Record<string, unknown> | undefined;
  if (wardrobe) {
    if (typeof wardrobe.top === "string" && wardrobe.top) {
      tags.push({ tag: `top:${normalize(wardrobe.top)}`, category: "wardrobe" });
    }
    if (typeof wardrobe.bottom === "string" && wardrobe.bottom) {
      tags.push({ tag: `bottom:${normalize(wardrobe.bottom)}`, category: "wardrobe" });
    }
    if (typeof wardrobe.footwear === "string" && wardrobe.footwear) {
      tags.push({ tag: `footwear:${normalize(wardrobe.footwear)}`, category: "wardrobe" });
    }
  }

  // Extract pose angle
  const pose = prompt_json.pose as Record<string, unknown> | undefined;
  if (pose && typeof pose.angle === "string" && pose.angle) {
    tags.push({ tag: `pose:${normalize(pose.angle)}`, category: "pose" });
  }

  // Extract scene/background
  const scene = prompt_json.scene as Record<string, unknown> | undefined;
  if (scene && typeof scene.location === "string" && scene.location) {
    tags.push({ tag: `scene:${normalize(scene.location)}`, category: "scene" });
  }

  const background = prompt_json.background as Record<string, unknown> | undefined;
  if (background && typeof background.setting === "string" && background.setting) {
    tags.push({ tag: `bg:${normalize(background.setting)}`, category: "background" });
  }

  return tags;
};

// Category prefix mapping for component-based tags
const COMPONENT_CATEGORY_PREFIXES: Record<string, string> = {
  characters: "char",
  physical_traits: "trait",
  jewelry: "jewelry",
  wardrobe: "wardrobe",
  wardrobe_tops: "top",
  wardrobe_bottoms: "bottom",
  wardrobe_footwear: "footwear",
  poses: "pose",
  scenes: "scene",
  backgrounds: "bg",
  camera: "camera",
  ban_lists: "ban",
};

// Extract tags from components_used array
export const extract_tags_from_components = (
  components: ComponentUsed[]
): { tag: string; category: string }[] => {
  const tags: { tag: string; category: string }[] = [];

  const normalize = (value: string): string => {
    return value.toLowerCase().replace(/\s+/g, "-").slice(0, 50);
  };

  for (const component of components) {
    const prefix = COMPONENT_CATEGORY_PREFIXES[component.category_id] || component.category_id;
    tags.push({
      tag: `${prefix}:${normalize(component.name)}`,
      category: component.category_id,
    });
  }

  return tags;
};

// Create tags for a generation
export const create_tags_for_generation = (
  generation_id: string,
  prompt_json: Record<string, unknown>,
  components_used?: ComponentUsed[] | null
): GenerationTag[] => {
  const db = get_db();

  // Prefer component-based tags if available, fall back to prompt extraction
  const tags = components_used && components_used.length > 0
    ? extract_tags_from_components(components_used)
    : extract_tags_from_prompt(prompt_json);

  const stmt = db.prepare(
    "INSERT INTO generation_tags (generation_id, tag, category) VALUES (?, ?, ?)"
  );

  const created: GenerationTag[] = [];

  for (const { tag, category } of tags) {
    const result = stmt.run(generation_id, tag, category);
    created.push({
      id: Number(result.lastInsertRowid),
      generation_id,
      tag,
      category,
    });
  }

  return created;
};

// Get tags for a specific generation
export const get_tags_for_generation = (generation_id: string): GenerationTag[] => {
  const db = get_db();
  return db
    .prepare("SELECT * FROM generation_tags WHERE generation_id = ?")
    .all(generation_id) as GenerationTag[];
};

// Get all unique tags with counts
export const get_all_tags_with_counts = (): TagWithCount[] => {
  const db = get_db();
  return db
    .prepare(
      `
      SELECT tag, category, COUNT(*) as count
      FROM generation_tags
      GROUP BY tag
      ORDER BY count DESC, tag ASC
    `
    )
    .all() as TagWithCount[];
};

// Get tags filtered by category
export const get_tags_by_category = (category: string): TagWithCount[] => {
  const db = get_db();
  return db
    .prepare(
      `
      SELECT tag, category, COUNT(*) as count
      FROM generation_tags
      WHERE category = ?
      GROUP BY tag
      ORDER BY count DESC, tag ASC
    `
    )
    .all(category) as TagWithCount[];
};

// Delete tags for a generation
export const delete_tags_for_generation = (generation_id: string): number => {
  const db = get_db();
  const result = db
    .prepare("DELETE FROM generation_tags WHERE generation_id = ?")
    .run(generation_id);
  return result.changes;
};

// Batch create tags for multiple generations (used by backfill)
export const batch_create_tags = (
  items: { generation_id: string; prompt_json: Record<string, unknown> }[]
): number => {
  const db = get_db();
  let total_created = 0;

  const insert_stmt = db.prepare(
    "INSERT INTO generation_tags (generation_id, tag, category) VALUES (?, ?, ?)"
  );

  const run_batch = db.transaction(() => {
    for (const { generation_id, prompt_json } of items) {
      const tags = extract_tags_from_prompt(prompt_json);
      for (const { tag, category } of tags) {
        insert_stmt.run(generation_id, tag, category);
        total_created++;
      }
    }
  });

  run_batch();
  return total_created;
};

// Search generations by tags (returns generation IDs)
export const search_generations_by_tags = (tags: string[]): string[] => {
  if (tags.length === 0) return [];

  const db = get_db();
  const placeholders = tags.map(() => "?").join(", ");

  // Find generations that have ALL specified tags
  const rows = db
    .prepare(
      `
      SELECT generation_id
      FROM generation_tags
      WHERE tag IN (${placeholders})
      GROUP BY generation_id
      HAVING COUNT(DISTINCT tag) = ?
    `
    )
    .all(...tags, tags.length) as { generation_id: string }[];

  return rows.map((r) => r.generation_id);
};
