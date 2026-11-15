export const SEARCH_MAX_LENGTH = 120;
export const SEARCH_GROUP_LIMIT = 10;

export function normalizeSearchQuery(query: string) {
  return query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .trim()
    .replace(/\s+/g, " ");
}
