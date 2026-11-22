import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildPathListHref, getVisiblePageNumbers } from "../pagination";

export function PathPagination({
  basePath,
  page,
  pageSize,
  totalItems,
  totalPages,
  queryParams,
}: {
  basePath: string;
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  queryParams?: Record<string, string | undefined>;
}) {
  if (totalItems === 0 || totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(totalItems, page * pageSize);
  const pageItems = getVisiblePageNumbers(page, totalPages);
  const href = (target: number) =>
    buildPathListHref(basePath, target, queryParams);

  return (
    <nav
      aria-label="Phân trang danh sách lộ trình"
      className="mt-6 flex flex-col gap-3 rounded-2xl border border-border/70 bg-background px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5"
    >
      <p className="text-sm text-muted-foreground tabular-nums">
        Hiển thị {start}–{end} trên {totalItems} lộ trình · Trang {page} /{" "}
        {totalPages}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {page > 1 ? (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted hover:text-primary"
          >
            <Link href={href(page - 1)} rel="prev">
              <ChevronLeft className="size-4" aria-hidden />
              Trang trước
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled
            className="border-border bg-background text-muted-foreground"
          >
            <ChevronLeft className="size-4" aria-hidden />
            Trang trước
          </Button>
        )}

        <ol className="flex flex-wrap items-center gap-1">
          {pageItems.map((item, index) =>
            item === "ellipsis" ? (
              <li
                key={`ellipsis-${index}`}
                aria-hidden
                className="px-2 text-sm text-muted-foreground select-none"
              >
                …
              </li>
            ) : item === page ? (
              <li key={item}>
                <span
                  aria-current="page"
                  className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-xs tabular-nums"
                >
                  {item}
                </span>
              </li>
            ) : (
              <li key={item}>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="min-w-9 rounded-lg px-3 text-foreground hover:bg-muted hover:text-primary tabular-nums"
                >
                  <Link href={href(item)} aria-label={`Trang ${item}`}>
                    {item}
                  </Link>
                </Button>
              </li>
            ),
          )}
        </ol>

        {page < totalPages ? (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted hover:text-primary"
          >
            <Link href={href(page + 1)} rel="next">
              Trang sau
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled
            className="border-border bg-background text-muted-foreground"
          >
            Trang sau
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        )}
      </div>
    </nav>
  );
}
