import type { CatalogFilters } from "./repository";

type Params = Record<string, string | string[] | undefined>;
const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/** Đọc bộ lọc từ URL; giá trị lạ bị bỏ qua thay vì làm hỏng trang. */
export function parseCatalogFilters(params: Params): CatalogFilters {
  const q = first(params.q)?.trim().slice(0, 100);
  const tag = first(params.tag)?.trim().slice(0, 24);
  const difficulty = DIFFICULTIES.find((d) => d === first(params.difficulty));
  return {
    ...(q ? { q } : {}),
    ...(tag ? { tag } : {}),
    ...(difficulty ? { difficulty } : {}),
    sort: first(params.sort) === "popular" ? "popular" : "newest",
  };
}

export function hasActiveFilters(filters: CatalogFilters) {
  return !!(filters.q || filters.tag || filters.difficulty);
}
