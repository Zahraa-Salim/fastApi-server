/**
 * Query helper module.
 * Builds URL query strings from optional filter, sort, and pagination parameters.
 */
export function buildQueryString(params: Record<string, string | number | undefined | null>): string {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    query.append(key, String(value));
  });

  const value = query.toString();
  return value ? `?${value}` : "";
}
