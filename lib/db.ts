import { Database } from "bun:sqlite";
import path from "path";

const db_path = path.join(process.cwd(), "data", "prompt-builder.db");

let db: Database | null = null;

export const get_db = (): Database => {
  if (!db) {
    db = new Database(db_path, { create: true });
    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA foreign_keys = ON");
  }
  return db;
};

export const transaction = <T>(fn: () => T): T => {
  const database = get_db();
  return database.transaction(fn)();
};

export const generate_id = (): string => {
  return crypto.randomUUID();
};
