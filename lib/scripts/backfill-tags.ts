/**
 * Backfill script to extract and create tags for existing generations.
 * Run with: npx tsx lib/scripts/backfill-tags.ts
 */

import { get_db } from "../db";
import { batch_create_tags, extract_tags_from_prompt } from "../repositories/tags";

type RawGeneration = {
  id: string;
  prompt_json: string;
};

const backfill_tags = () => {
  const db = get_db();

  // Check how many generations already have tags
  const existing_tags_count = (
    db.prepare("SELECT COUNT(DISTINCT generation_id) as count FROM generation_tags").get() as {
      count: number;
    }
  ).count;

  console.log(`Generations with existing tags: ${existing_tags_count}`);

  // Get all completed generations that don't have tags yet
  const generations = db
    .prepare(
      `
      SELECT g.id, g.prompt_json
      FROM generations g
      WHERE g.status = 'completed'
      AND g.id NOT IN (SELECT DISTINCT generation_id FROM generation_tags)
    `
    )
    .all() as RawGeneration[];

  console.log(`Found ${generations.length} generations to backfill`);

  if (generations.length === 0) {
    console.log("No generations need backfilling.");
    return;
  }

  // Parse and prepare for batch insert
  const items = generations.map((g) => ({
    generation_id: g.id,
    prompt_json: JSON.parse(g.prompt_json) as Record<string, unknown>,
  }));

  // Preview what tags will be created
  let preview_count = 0;
  for (const item of items.slice(0, 3)) {
    const tags = extract_tags_from_prompt(item.prompt_json);
    console.log(`\nGeneration ${item.generation_id}:`);
    console.log(`  Tags: ${tags.map((t) => t.tag).join(", ") || "(none)"}`);
    preview_count++;
  }

  if (generations.length > 3) {
    console.log(`\n... and ${generations.length - 3} more generations`);
  }

  // Run the batch insert
  console.log("\nBackfilling tags...");
  const total_created = batch_create_tags(items);

  console.log(`\nBackfill complete!`);
  console.log(`  Generations processed: ${generations.length}`);
  console.log(`  Tags created: ${total_created}`);

  // Show summary by category
  const summary = db
    .prepare(
      `
      SELECT category, COUNT(*) as count
      FROM generation_tags
      GROUP BY category
      ORDER BY count DESC
    `
    )
    .all() as { category: string; count: number }[];

  console.log("\nTags by category:");
  for (const row of summary) {
    console.log(`  ${row.category || "(no category)"}: ${row.count}`);
  }
};

// Run if called directly
if (require.main === module) {
  backfill_tags();
}

export { backfill_tags };
