import Link from "next/link";
import { ChevronLeft, ChevronRight, ClipboardCheck } from "lucide-react";
import { listHandwrittenReviews } from "@/features/handwritten/review";
import { formatDateTime } from "@/features/paths/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Chấm bài tự luận | Code Carf" };

function scoreLabel(score: number | null) {
  return score === null ? "—" : `${(score / 10).toLocaleString("vi-VN")}/10`;
}

export default async function GradingPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string }>;
}) {
  const params = await searchParams;
  const data = await listHandwrittenReviews(params);
  const tabs = [
    { value: "pending", label: `Chờ chấm (${data.pendingCount})` },
    { value: "graded", label: "Đã chấm" },
  ] as const;
  const pageHref = (page: number) =>
    `/gv/grading?filter=${data.filter}&page=${page}`;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="space-y-1.5">
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">
          Giảng dạy
        </p>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Chấm bài tự luận
        </h1>
        <p className="text-sm text-muted-foreground">
          Bài học viên nộp ảnh trong các lộ trình bạn quản lý. Nộp ảnh là học
          viên đã qua bài; điểm và nhận xét của bạn hiện ngay cho học viên.
        </p>
      </header>

      <nav aria-label="Lọc bài" className="flex gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={`/gv/grading?filter=${tab.value}`}
            aria-current={data.filter === tab.value ? "page" : undefined}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
              data.filter === tab.value
                ? "border-primary bg-secondary text-primary"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {data.items.length === 0 ? (
        <div
          role="status"
          className="flex flex-col items-center gap-2 rounded-2xl border border-dashed bg-muted/20 px-6 py-12 text-center"
        >
          <ClipboardCheck className="size-8 text-primary" aria-hidden />
          <p className="font-semibold">
            {data.filter === "pending"
              ? "Không còn bài nào chờ chấm"
              : "Chưa chấm bài nào"}
          </p>
          <p className="text-sm text-muted-foreground">
            Bài tự luận học viên nộp trong lộ trình của bạn sẽ hiện ở đây.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {data.items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/gv/grading/${item.id}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border bg-background px-4 py-3.5 transition-[border-color,box-shadow] hover:border-primary/40 hover:shadow-xs focus-visible:outline-2 focus-visible:outline-ring"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="font-semibold break-words">{item.exercise}</p>
                  <p className="text-xs text-muted-foreground break-words">
                    {item.path} · {item.lesson}
                  </p>
                </div>
                <div className="text-sm">
                  <p className="font-medium">{item.learner}</p>
                  <p className="text-xs text-muted-foreground">
                    Nộp {formatDateTime(item.submittedAt)}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold tabular-nums",
                    item.reviewedAt
                      ? item.status === "ACCEPTED"
                        ? "bg-success/15 text-success"
                        : "bg-destructive/10 text-destructive"
                      : "bg-warning/15 text-warning",
                  )}
                >
                  {item.reviewedAt ? scoreLabel(item.score) : "Chờ chấm"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {data.totalPages > 1 && (
        <nav
          aria-label="Phân trang"
          className="flex items-center justify-between text-sm"
        >
          {data.page > 1 ? (
            <Link
              href={pageHref(data.page - 1)}
              className="inline-flex items-center gap-1 font-semibold text-primary"
            >
              <ChevronLeft className="size-4" aria-hidden />
              Trang trước
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground">
            Trang {data.page} / {data.totalPages}
          </span>
          {data.page < data.totalPages ? (
            <Link
              href={pageHref(data.page + 1)}
              className="inline-flex items-center gap-1 font-semibold text-primary"
            >
              Trang sau
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
