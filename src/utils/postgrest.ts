/**
 * Helpers for building Supabase / PostgREST queries safely.
 */

/**
 * Escapes LIKE / ILIKE wildcards so user-provided text is matched literally.
 *
 * `%`, `_` and `\` are escaped with a backslash (Postgres' default LIKE escape).
 * PostgREST additionally treats `*` as an alias for `%` and offers no way to
 * escape it, so `*` is downgraded to `_` (matches exactly one character).
 */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&').replace(/\*/g, '_');
}

/**
 * True when PostgREST reports that `column` does not exist yet, e.g. because a
 * database migration has not been applied. Covers both filter/select errors
 * (Postgres 42703) and insert/update payload errors (PGRST204).
 */
export function isMissingColumnError(error: any, column: string): boolean {
  if (!error) return false;
  const text = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`;
  if (!text.includes(column)) return false;
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    /does not exist|could not find/i.test(text)
  );
}

/** Supabase's default `max-rows`: a single response never contains more rows. */
export const SUPABASE_MAX_ROWS = 1000;

type PageResponse<T> = PromiseLike<{ data: T[] | null; error: any }>;

/**
 * Fetches every row of a query page by page. A plain `select()` is silently
 * truncated at the project's `max-rows` limit (1000 by default), which made
 * client-side counts and statistics wrong once a table grew past it.
 *
 * `buildPage` must return a fresh query with a deterministic `.order()` and the
 * given `.range(from, to)` applied. `pageSize` must not exceed the project's
 * `max-rows` setting.
 */
export async function fetchAllRows<T = any>(
  buildPage: (from: number, to: number) => PageResponse<T>,
  pageSize: number = SUPABASE_MAX_ROWS
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await buildPage(from, from + pageSize - 1);
    if (error) throw error;
    const page = data || [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}
