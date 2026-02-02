import { get_db } from "../db";
import fs from "fs";
import path from "path";

export const run_migrations = () => {
  const db = get_db();

  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const applied = new Set(
    (db.prepare("SELECT name FROM _migrations").all() as { name: string }[]).map(
      (r) => r.name
    )
  );

  const migrations_dir = path.join(process.cwd(), "lib", "migrations");
  const files = fs
    .readdirSync(migrations_dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;

    const sql = fs.readFileSync(path.join(migrations_dir, file), "utf-8");

    db.transaction(() => {
      db.exec(sql);
      db.prepare("INSERT INTO _migrations (name) VALUES (?)").run(file);
    })();

    console.log(`Applied migration: ${file}`);
  }

  if (files.filter((f) => !applied.has(f)).length === 0) {
    console.log("No pending migrations.");
  }
};

if (require.main === module) {
  run_migrations();
}
