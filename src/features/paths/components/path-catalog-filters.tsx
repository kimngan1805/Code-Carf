import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DIFFICULTY_LABELS } from "../cover-themes";
import { hasActiveFilters } from "../catalog-filters";
import type { CatalogFilters } from "../repository";

const fieldClass =
  "h-10 rounded-lg border bg-background px-3 text-sm focus-visible:outline-2";

/** Bộ lọc dùng form GET thuần nên link chia sẻ được và không cần JavaScript. */
export function PathCatalogFilters({
  filters,
  tags,
}: {
  filters: CatalogFilters;
  tags: string[];
}) {
  const href = (tag?: string) => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.difficulty) params.set("difficulty", filters.difficulty);
    if (filters.sort === "popular") params.set("sort", "popular");
    if (tag) params.set("tag", tag);
    const query = params.toString();
    return query ? `/hv/paths?${query}` : "/hv/paths";
  };
  return (
    <section aria-label="Tìm và lọc lộ trình" className="mt-6 space-y-4">
      <form
        method="get"
        action="/hv/paths"
        className="flex flex-wrap items-end gap-3"
      >
        {filters.tag && <input type="hidden" name="tag" value={filters.tag} />}
        <div className="min-w-56 flex-1">
          <label htmlFor="catalog-q" className="sr-only">
            Tìm lộ trình
          </label>
          <div className="relative">
            <Search
              aria-hidden
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <input
              id="catalog-q"
              name="q"
              type="search"
              maxLength={100}
              defaultValue={filters.q}
              placeholder="Tìm theo tên, chủ đề hoặc giảng viên"
              className={cn(fieldClass, "w-full pl-9")}
            />
          </div>
        </div>
        <div>
          <label htmlFor="catalog-difficulty" className="sr-only">
            Độ khó
          </label>
          <select
            id="catalog-difficulty"
            name="difficulty"
            defaultValue={filters.difficulty ?? ""}
            className={fieldClass}
          >
            <option value="">Mọi độ khó</option>
            {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="catalog-sort" className="sr-only">
            Sắp xếp
          </label>
          <select
            id="catalog-sort"
            name="sort"
            defaultValue={filters.sort}
            className={fieldClass}
          >
            <option value="newest">Mới nhất</option>
            <option value="popular">Nhiều học viên nhất</option>
          </select>
        </div>
        <Button type="submit">Áp dụng</Button>
        {hasActiveFilters(filters) && (
          <Button asChild variant="ghost">
            <Link href="/hv/paths">Xóa bộ lọc</Link>
          </Button>
        )}
      </form>
      {tags.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Lọc theo chủ đề">
          {tags.map((tag) => {
            const active = filters.tag === tag;
            return (
              <li key={tag}>
                <Link
                  href={active ? href() : href(tag)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "inline-block rounded-full border px-3 py-1 text-xs font-medium focus-visible:outline-2",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  #{tag}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
