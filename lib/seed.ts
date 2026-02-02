import { get_db } from "./db";
import { run_migrations } from "./migrations";

const SEED_CATEGORIES = [
  {
    id: "characters",
    name: "Characters",
    description: "Complete character presets (subject section)",
    sort_order: 0,
  },
  {
    id: "physical_traits",
    name: "Physical Traits",
    description: "Hair, skin, body type, ethnicity",
    sort_order: 1,
  },
  {
    id: "jewelry",
    name: "Jewelry",
    description: "Accessories, metals, chains, earrings",
    sort_order: 2,
  },
  {
    id: "wardrobe",
    name: "Wardrobe",
    description: "Complete outfit (top + bottom + footwear)",
    sort_order: 3,
  },
  {
    id: "wardrobe_tops",
    name: "Tops",
    description: "Upper body garments",
    sort_order: 4,
  },
  {
    id: "wardrobe_bottoms",
    name: "Bottoms",
    description: "Lower body garments",
    sort_order: 5,
  },
  {
    id: "wardrobe_footwear",
    name: "Footwear",
    description: "Shoes, boots, barefoot",
    sort_order: 6,
  },
  {
    id: "poses",
    name: "Poses",
    description: "Body position, hands, framing",
    sort_order: 7,
  },
  {
    id: "scenes",
    name: "Scenes",
    description: "Overall scene description",
    sort_order: 8,
  },
  {
    id: "backgrounds",
    name: "Backgrounds",
    description: "Environment and props",
    sort_order: 9,
  },
  {
    id: "camera",
    name: "Camera/Look",
    description: "Device, flash, texture, color settings",
    sort_order: 10,
  },
  {
    id: "ban_lists",
    name: "Ban Lists",
    description: "Items to exclude from generation",
    sort_order: 11,
  },
];

const seed_categories = () => {
  const db = get_db();

  const existing = db.prepare("SELECT COUNT(*) as count FROM categories").get() as {
    count: number;
  };

  if (existing.count > 0) {
    console.log("Categories already seeded, skipping...");
    return;
  }

  const insert = db.prepare(
    "INSERT INTO categories (id, name, description, sort_order) VALUES (?, ?, ?, ?)"
  );

  db.transaction(() => {
    for (const category of SEED_CATEGORIES) {
      insert.run(category.id, category.name, category.description, category.sort_order);
    }
  })();

  console.log(`Seeded ${SEED_CATEGORIES.length} categories.`);
};

const main = () => {
  console.log("Running migrations...");
  run_migrations();

  console.log("\nSeeding data...");
  seed_categories();

  console.log("\nDone!");
};

if (require.main === module) {
  main();
}

export { seed_categories, SEED_CATEGORIES };
