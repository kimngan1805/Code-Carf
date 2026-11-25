import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, CheckCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ManagedPathCard } from "@/features/paths/components/managed-path-card";
import { PathPagination } from "@/features/paths/components/path-pagination";
import { formatDateTime } from "@/features/paths/format";
import { getManagedPaths } from "@/features/paths/management";
import { AppError } from "@/lib/errors";

export const metadata = {
  title: "Quản lý lộ trình · Code Carf",
};

export default async function ManagedPathsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[]; deleted?: string }>;
}) {
  const query = await searchParams;
  const deleted = query.deleted === "1";
  const result = await getManagedPaths({ page: query.page }).catch((error) => {
    if (error instanceof AppError) {
      if (error.status === 401) redirect("/login?callbackUrl=/gv/paths");
      if (error.status === 403) redirect("/forbidden");
    }
    throw error;
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Page Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">
            Quản lý nội dung
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Quản lý lộ trình
            </h1>
            <span className="rounded-full border border-border/70 bg-background px-3 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
              {result.totalItems} lộ trình
            </span>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Tạo lộ trình học, biên soạn bài học và quản lý trạng thái xuất bản
            cho học viên.
          </p>
        </div>

        <Button
          asChild
          size="default"
          className="shrink-0 rounded-full px-5 shadow-[3px_3px_0_0_var(--brand-blue)]"
        >
          <Link href="/gv/paths/new">
            <Plus aria-hidden className="size-4" />
            Tạo lộ trình
          </Link>
        </Button>
      </header>

      {/* Soft-delete confirmation banner */}
      {deleted && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-success/25 bg-success/10 px-4 py-3.5 text-sm font-medium text-success"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            Đã xóa lộ trình. Dữ liệu học tập, bài nộp và thành tích của học viên
            vẫn được bảo toàn.
          </p>
        </div>
      )}

      {/* Empty State or Responsive Path Grid */}
      {result.items.length === 0 ? (
        <section className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-background px-6 py-16 text-center">
          <span
            aria-hidden
            className="grid size-14 place-items-center rounded-2xl bg-secondary/70 text-primary"
          >
            <BookOpen className="size-7" />
          </span>
          <h2 className="mt-4 text-lg font-bold text-foreground">
            Chưa có lộ trình nào
          </h2>
          <p className="mt-1.5 max-w-md text-sm leading-6 text-muted-foreground">
            Bắt đầu tạo lộ trình đầu tiên để tổ chức bài học lý thuyết, bài tập
            lập trình và chia sẻ với học viên.
          </p>
          <Button asChild className="mt-6 rounded-xl">
            <Link href="/gv/paths/new">
              <Plus aria-hidden className="size-4" />
              Tạo lộ trình đầu tiên
            </Link>
          </Button>
        </section>
      ) : (
        <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {result.items.map((path) => (
            <ManagedPathCard
              key={path.id}
              path={{
                id: path.id,
                slug: path.slug,
                title: path.title,
                description: path.description,
                published: path.published,
                sequentialUnlock: path.sequentialUnlock,
                difficulty: path.difficulty,
                tags: path.tags,
                estimatedMinutes: path.estimatedMinutes,
                coverTheme: path.coverTheme,
                postedLabel: path.published
                  ? formatDateTime(path.publishedAt)
                  : formatDateTime(path.createdAt),
                _count: path._count,
              }}
            />
          ))}
        </ul>
      )}

      {/* Server-side Pagination */}
      <PathPagination
        basePath="/gv/paths"
        page={result.page}
        pageSize={result.pageSize}
        totalItems={result.totalItems}
        totalPages={result.totalPages}
      />
    </div>
  );
}
