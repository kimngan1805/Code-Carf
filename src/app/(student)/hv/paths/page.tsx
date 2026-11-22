import { PathList } from "@/features/paths/components/path-list";
import { PathCatalogFilters } from "@/features/paths/components/path-catalog-filters";
import { PathPagination } from "@/features/paths/components/path-pagination";
import { getCatalogPathsPage, getCatalogTags } from "@/features/paths/service";
import {
  hasActiveFilters,
  parseCatalogFilters,
} from "@/features/paths/catalog-filters";
import { getCurrentUser } from "@/features/auth/service";
import { isTeacherRole } from "@/features/auth/permissions";
import { redirect } from "next/navigation";

export default async function PathsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (user && isTeacherRole(user.role.name)) redirect("/gv/paths");
  const params = await searchParams;
  const filters = parseCatalogFilters(params);
  const [catalog, tags] = await Promise.all([
    getCatalogPathsPage(filters, { page: params.page }),
    getCatalogTags(),
  ]);
  return (
    <div className="mx-auto w-full max-w-6xl">
      <h1 className="text-2xl font-bold text-primary">Lộ trình học</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Lộ trình do giảng viên chia sẻ. Thêm vào danh sách của bạn để bắt đầu
        học.
      </p>
      <PathCatalogFilters filters={filters} tags={tags} />
      <PathList paths={catalog.items} filtered={hasActiveFilters(filters)} />
      <PathPagination
        basePath="/hv/paths"
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
  );
}
