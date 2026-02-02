import type { SQLQueryBindings } from "bun:sqlite";

import { get_db } from "./db";

export const parse_json = <T>(value: string | null): T | null => {
  if (!value) return null;
  return JSON.parse(value) as T;
};

export const now = (): string => {
  return new Date().toISOString();
};

export type PaginationOptions = {
  page?: number;
  limit?: number;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
};

export const paginate = <T>(
  query: string,
  count_query: string,
  params: SQLQueryBindings[],
  options: PaginationOptions
): PaginatedResult<T> => {
  const db = get_db();
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const offset = (page - 1) * limit;

  const total = (db.prepare(count_query).get(...params) as { count: number }).count;
  const items = db.prepare(`${query} LIMIT ? OFFSET ?`).all(...params, limit, offset) as T[];

  return {
    items,
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit),
  };
};
