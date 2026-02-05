import Database from "better-sqlite3";
import path from "path";

const db_path = path.join(process.cwd(), "data", "prompt-builder.db");

let db: Database.Database | null = null;

export const get_db = (): Database.Database => {
  if (!db) {
    db = new Database(db_path);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  }
  return db;
};

/**
 * Closes the database connection and releases resources.
 * Should be called on server shutdown for graceful cleanup.
 */
export const close_db = (): void => {
  if (db) {
    db.close();
    db = null;
  }
};

// Register cleanup handlers for graceful shutdown
if (typeof process !== "undefined") {
  const cleanup = () => {
    close_db();
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

export const transaction = <T>(fn: () => T): T => {
  const database = get_db();
  return database.transaction(fn)();
};

export const generate_id = (): string => {
  return crypto.randomUUID();
};
