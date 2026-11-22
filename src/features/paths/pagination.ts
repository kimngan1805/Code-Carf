export const MANAGED_PATHS_PAGE_SIZE = 9;
export const CATALOG_PATHS_PAGE_SIZE = 9;
export const MAX_PATHS_PAGE_SIZE = 50;

export interface PaginatedPaths<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginationComputation {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  skip: number;
}

/** Đọc số trang từ URL/input; mọi giá trị không phải số nguyên dương đều quay về trang 1. */
export function parsePathPage(raw: unknown): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value >= 1 ? value : 1;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) return 1;
    const parsed = Number(trimmed);
    return Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : 1;
  }
  return 1;
}

export function normalizePageSize(raw: unknown, fallback: number): number {
  return typeof raw === "number" &&
    Number.isSafeInteger(raw) &&
    raw >= 1 &&
    raw <= MAX_PATHS_PAGE_SIZE
    ? raw
    : fallback;
}

/** Tính trang hợp lệ (kẹp trong 1..totalPages) và offset skip cho Prisma. */
export function computePagination(
  rawPage: unknown,
  totalItems: number,
  pageSize: number,
): PaginationComputation {
  const safeTotal =
    Number.isFinite(totalItems) && totalItems > 0 ? Math.floor(totalItems) : 0;
  const safeSize = normalizePageSize(pageSize, MANAGED_PATHS_PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(safeTotal / safeSize));
  const requested = parsePathPage(rawPage);
  const page = Math.min(Math.max(1, requested), totalPages);
  return {
    page,
    pageSize: safeSize,
    totalItems: safeTotal,
    totalPages,
    skip: (page - 1) * safeSize,
  };
}

/** Trả về danh sách số trang và dấu "…" gọn gàng để hiển thị thanh phân trang. */
export function getVisiblePageNumbers(
  currentPage: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const pages = new Set<number>([1, totalPages]);
  for (
    let p = Math.max(1, currentPage - 1);
    p <= Math.min(totalPages, currentPage + 1);
    p++
  ) {
    pages.add(p);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const result: Array<number | "ellipsis"> = [];
  for (let i = 0; i < sorted.length; i++) {
    const num = sorted[i];
    if (i > 0 && num - sorted[i - 1] > 1) {
      result.push("ellipsis");
    }
    result.push(num);
  }
  return result;
}

/** Tạo URL chuyển trang mà vẫn giữ nguyên các query params bộ lọc khác. */
export function buildPathListHref(
  basePath: string,
  page: number,
  queryParams?: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();
  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (key === "page") continue;
      if (value) params.set(key, value);
    }
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}
