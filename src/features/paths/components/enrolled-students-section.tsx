import Link from "next/link";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type {
  LearnerProgressStatus,
  ManagedPathEnrolledStudentsPage,
} from "../enrolled-students";
import { getVisiblePageNumbers } from "../pagination";

const STATUS_META: Record<
  LearnerProgressStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  completed: {
    label: "Hoàn thành",
    badgeClass: "border-success/25 bg-success/10 text-success",
    dotClass: "bg-success",
  },
  in_progress: {
    label: "Đang học",
    badgeClass: "border-highlight/30 bg-highlight/15 text-primary",
    dotClass: "bg-primary",
  },
  not_started: {
    label: "Chưa bắt đầu",
    badgeClass: "border-border/80 bg-muted text-muted-foreground",
    dotClass: "bg-muted-foreground",
  },
};

function studentInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatEnrolledDate(date: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

export function buildEnrolledStudentsPageHref(
  pathSlug: string,
  page: number,
): string {
  const base = `/gv/paths/${pathSlug}`;
  return page > 1
    ? `${base}?studentsPage=${page}#hoc-vien`
    : `${base}#hoc-vien`;
}

function LearnerStatusBadge({ status }: { status: LearnerProgressStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        meta.badgeClass,
      )}
    >
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", meta.dotClass)}
      />
      {meta.label}
    </span>
  );
}

export function EnrolledStudentsSection({
  pathSlug,
  pathPublished,
  data,
}: {
  pathSlug: string;
  pathPublished: boolean;
  data: ManagedPathEnrolledStudentsPage;
}) {
  const { items, totalPublishedRooms, page, pageSize, totalItems, totalPages } =
    data;
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(totalItems, page * pageSize);
  const pageItems = getVisiblePageNumbers(page, totalPages);

  return (
    <section
      id="hoc-vien"
      aria-labelledby="enrolled-students-heading"
      className="scroll-mt-24 rounded-2xl border border-border/70 bg-background p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="enrolled-students-heading"
              className="text-lg font-bold text-foreground"
            >
              Học viên đã đăng ký
            </h2>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
              {totalItems} học viên
            </span>
          </div>
          <p className="text-xs text-muted-foreground tabular-nums">
            {totalPublishedRooms > 0
              ? `Tiến độ tính trên ${totalPublishedRooms} bài học đã xuất bản.`
              : "Chưa có bài học đã xuất bản để tính tiến độ hoàn thành."}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-5 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/25 px-6 py-10 text-center">
          <span
            aria-hidden
            className="grid size-11 place-items-center rounded-2xl bg-secondary/70 text-primary"
          >
            <Users className="size-5" />
          </span>
          <h3 className="mt-3 text-sm font-semibold text-foreground">
            Chưa có học viên nào đăng ký
          </h3>
          <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
            {pathPublished
              ? "Khi học viên đăng ký lộ trình này, danh sách và tiến độ hoàn thành sẽ hiển thị tại đây."
              : "Xuất bản lộ trình để học viên có thể tìm thấy và đăng ký học."}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table view */}
          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/60 text-xs font-semibold text-muted-foreground">
                  <th scope="col" className="pb-3 pr-4">
                    Học viên
                  </th>
                  <th scope="col" className="pb-3 pr-4">
                    Ngày đăng ký
                  </th>
                  <th scope="col" className="pb-3 pr-4">
                    Tiến độ
                  </th>
                  <th scope="col" className="pb-3 text-right">
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {items.map((student) => (
                  <tr
                    key={student.userId}
                    className="transition-colors hover:bg-muted/30"
                  >
                    <td className="py-3 pr-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          aria-hidden
                          className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary/70 text-xs font-bold text-primary"
                        >
                          {studentInitials(student.name)}
                        </span>
                        <span className="truncate font-semibold text-foreground">
                          {student.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                      {formatEnrolledDate(student.enrolledAt)}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <Progress
                          value={student.percent / 100}
                          label={`Tiến độ hoàn thành của ${student.name}`}
                          className="h-1.5 w-24 shrink-0"
                          barClassName={
                            student.status === "completed"
                              ? "bg-success"
                              : "bg-primary"
                          }
                        />
                        <span className="text-xs font-semibold text-foreground whitespace-nowrap tabular-nums">
                          {student.percent}%
                        </span>
                        {totalPublishedRooms > 0 && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                            ({student.completedRooms}/{totalPublishedRooms})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-right">
                      <LearnerStatusBadge status={student.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list view */}
          <ul className="mt-4 space-y-2.5 md:hidden">
            {items.map((student) => (
              <li
                key={student.userId}
                className="space-y-3 rounded-xl border border-border/70 bg-background p-3.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      aria-hidden
                      className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary/70 text-xs font-bold text-primary"
                    >
                      {studentInitials(student.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {student.name}
                      </p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        Đăng ký {formatEnrolledDate(student.enrolledAt)}
                      </p>
                    </div>
                  </div>
                  <LearnerStatusBadge status={student.status} />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs tabular-nums">
                    <span className="text-muted-foreground">Tiến độ</span>
                    <span className="font-semibold text-foreground">
                      {student.percent}%
                      {totalPublishedRooms > 0
                        ? ` (${student.completedRooms}/${totalPublishedRooms})`
                        : ""}
                    </span>
                  </div>
                  <Progress
                    value={student.percent / 100}
                    label={`Tiến độ hoàn thành của ${student.name}`}
                    className="h-1.5"
                    barClassName={
                      student.status === "completed"
                        ? "bg-success"
                        : "bg-primary"
                    }
                  />
                </div>
              </li>
            ))}
          </ul>

          {/* Server-side pagination */}
          {totalPages > 1 && (
            <nav
              aria-label="Phân trang danh sách học viên"
              className="mt-5 flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-xs text-muted-foreground tabular-nums">
                Hiển thị {start}–{end} trên {totalItems} học viên · Trang {page}{" "}
                / {totalPages}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {page > 1 ? (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted hover:text-primary"
                  >
                    <Link
                      href={buildEnrolledStudentsPageHref(pathSlug, page - 1)}
                      rel="prev"
                    >
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
                        className="px-2 text-xs text-muted-foreground select-none"
                      >
                        …
                      </li>
                    ) : item === page ? (
                      <li key={item}>
                        <span
                          aria-current="page"
                          className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground tabular-nums"
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
                          className="min-w-9 rounded-lg px-3 text-xs text-foreground hover:bg-muted hover:text-primary tabular-nums"
                        >
                          <Link
                            href={buildEnrolledStudentsPageHref(pathSlug, item)}
                            aria-label={`Trang học viên ${item}`}
                          >
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
                    <Link
                      href={buildEnrolledStudentsPageHref(pathSlug, page + 1)}
                      rel="next"
                    >
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
          )}
        </>
      )}
    </section>
  );
}
