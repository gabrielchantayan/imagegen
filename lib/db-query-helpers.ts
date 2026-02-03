/**
 * SQL query builder utilities for reducing boilerplate in repositories.
 */

export type BindValue = string | number | bigint | Buffer | null;

/**
 * Generates SQL placeholders for IN clauses.
 * @param count - Number of placeholders to generate
 * @returns A string of comma-separated question marks, e.g., "?, ?, ?"
 * @example
 * const ids = ['a', 'b', 'c'];
 * const placeholders = build_sql_placeholders(ids.length); // "?, ?, ?"
 * db.prepare(`SELECT * FROM table WHERE id IN (${placeholders})`).all(...ids);
 */
export const build_sql_placeholders = (count: number): string => {
  if (count <= 0) return "";
  return Array(count).fill("?").join(", ");
};

/**
 * Result from build_update_query containing SQL parts and bind values.
 */
export type UpdateQueryResult = {
  /** Array of "column = ?" strings ready to join with ", " */
  sql_parts: string[];
  /** Array of values corresponding to each sql_part */
  values: BindValue[];
};

/**
 * Configuration for a field in the update query builder.
 */
export type FieldConfig = {
  /** The SQL column name */
  column: string;
  /** Optional transform function to convert the input value before binding */
  transform?: (value: unknown) => BindValue;
};

/**
 * Field mapping where keys are input field names and values are either
 * a column name string or a FieldConfig object for custom transformations.
 */
export type FieldMapping<T> = Partial<Record<keyof T, string | FieldConfig>>;

/**
 * Builds dynamic UPDATE query parts from an input object.
 * Only includes fields that are not undefined.
 *
 * @param input - The input object containing fields to update
 * @param field_mapping - Maps input field names to SQL column names or FieldConfig
 * @returns Object with sql_parts array and values array
 *
 * @example
 * type UpdateInput = { name?: string; data?: object; is_active?: boolean };
 * const input: UpdateInput = { name: 'New Name', data: { foo: 'bar' } };
 *
 * const { sql_parts, values } = build_update_query(input, {
 *   name: 'name',
 *   data: { column: 'data', transform: (v) => JSON.stringify(v) },
 *   is_active: { column: 'is_active', transform: (v) => v ? 1 : 0 },
 * });
 *
 * // sql_parts: ['name = ?', 'data = ?']
 * // values: ['New Name', '{"foo":"bar"}']
 *
 * if (sql_parts.length > 0) {
 *   db.prepare(`UPDATE table SET ${sql_parts.join(', ')} WHERE id = ?`).run(...values, id);
 * }
 */
export const build_update_query = <T extends Record<string, unknown>>(
  input: T,
  field_mapping: FieldMapping<T>
): UpdateQueryResult => {
  const sql_parts: string[] = [];
  const values: BindValue[] = [];

  for (const key of Object.keys(field_mapping) as Array<keyof T>) {
    const value = input[key];
    if (value === undefined) continue;

    const mapping = field_mapping[key];
    if (!mapping) continue;

    let column: string;
    let transformed_value: BindValue;

    if (typeof mapping === "string") {
      column = mapping;
      transformed_value = value as BindValue;
    } else {
      column = mapping.column;
      transformed_value = mapping.transform
        ? mapping.transform(value)
        : (value as BindValue);
    }

    sql_parts.push(`${column} = ?`);
    values.push(transformed_value);
  }

  return { sql_parts, values };
};
