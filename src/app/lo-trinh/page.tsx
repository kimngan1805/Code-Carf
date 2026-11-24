import type { Metadata } from "next";
import {
  PathShowcaseFilters,
  PathShowcaseGrid,
  PathShowcaseHero,
  PathSpotlight,
} from "@/features/paths/components/path-showcase";
import { PathPagination } from "@/features/paths/components/path-pagination";
import {
  getPublicCatalogPathsPage,
  getPublicCatalogTags,
} from "@/features/paths/service";
import {
  hasActiveFilters,
  parseCatalogFilters,
} from "@/features/paths/catalog-filters";

export const metadata: Metadata = {
  title: "Khám phá lộ trình · Code Carf",
  description:
    "Khám phá các lộ trình lập trình do giảng viên chia sẻ, từ cơ bản đến nâng cao.",
};

export default async function PathShowcasePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseCatalogFilters(params);
  const [catalog, tags] = await Promise.all([
    getPublicCatalogPathsPage(filters, { page: params.page }),
    getPublicCatalogTags(),
  ]);
  const filtered = hasActiveFilters(filters);
  return (
    <main className="bg-gradient-to-b from-secondary/40 via-secondary/10 to-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <PathShowcaseHero />
        {!filtered && catalog.page === 1 && (
          <PathSpotlight paths={catalog.items} />
        )}
        <PathShowcaseFilters
          filters={filters}
          tags={tags}
          basePath="/lo-trinh"
        />
        <PathShowcaseGrid paths={catalog.items} filtered={filtered} />
        <PathPagination
          basePath="/lo-trinh"
          page={catalog.page}
          pageSize={catalog.pageSize}
          totalItems={catalog.totalItems}
          totalPages={catalog.totalPages}
          queryParams={{
            q: filters.q,
            difficulty: filters.difficulty,
            tag: filters.tag,
            sort: filters.sort === "popular" ? "popular" : undefined,
          }}
        />
      </div>
    </main>
  );
}
