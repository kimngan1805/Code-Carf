import Link from "next/link";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SubmissionHistory } from "../history";
import {
  formatScore,
  formatSubmittedAt,
  languageLabel,
  submissionStatusView,
} from "../history-view";
import { toneClass } from "./submission-result";

const columns = ["Bài tập", "Ngôn ngữ", "Kết quả", "Điểm", "Nộp lúc", ""];

export function SubmissionHistoryView({
  history,
}: {
  history: SubmissionHistory;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Lịch sử nộp bài</h1>
        <p className="text-sm text-muted-foreground">
          {history.total > 0
            ? `${history.total} lần nộp trong các bài luyện tập của bạn.`
            : "Các lần nộp bài luyện tập của bạn sẽ hiện ở đây."}
        </p>
      </header>
      {history.items.length === 0 ? (
        <section className="space-y-4 rounded-2xl border bg-background p-8 text-center">
          <History className="mx-auto size-10 text-primary" aria-hidden />
          <p className="text-muted-foreground">Bạn chưa nộp bài nào.</p>
          <Button asChild>
            <Link href="/hv/paths">Chọn lộ trình để bắt đầu</Link>
          </Button>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border bg-background">
          <ul className="divide-y md:hidden">
            {history.items.map((item) => {
              const status = submissionStatusView(item.status);
              return (
                <li key={item.id}>
                  <Link
                    href={`/hv/submissions/${item.id}`}
                    className="block space-y-2 px-4 py-4 hover:bg-muted/50 focus-visible:outline-2 focus-visible:-outline-offset-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 font-semibold break-words">
                        {item.exercise.title}
                      </p>
                      <span
                        className={cn(
                          "inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          toneClass[status.tone],
                        )}
                      >
                        {status.label}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {languageLabel(item.language)} ·{" "}
                      {formatScore(item.score, item.maxScore)} điểm
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatSubmittedAt(item.createdAt)}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">
                Các lần nộp bài, mới nhất trước
              </caption>
              <thead className="bg-muted text-xs text-muted-foreground">
                <tr>
                  {columns.map((label, index) => (
                    <th scope="col" key={index} className="px-5 py-3">
                      {label || <span className="sr-only">Hành động</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {history.items.map((item) => {
                  const status = submissionStatusView(item.status);
                  return (
                    <tr key={item.id}>
                      <td className="max-w-64 px-5 py-3 font-semibold break-words">
                        {item.exercise.title}
                      </td>
                      <td className="px-5 py-3">
                        {languageLabel(item.language)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            toneClass[status.tone],
                          )}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        {formatScore(item.score, item.maxScore)}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-muted-foreground">
                        {formatSubmittedAt(item.createdAt)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/hv/submissions/${item.id}`}
                          className="font-semibold whitespace-nowrap text-primary hover:underline"
                        >
                          Xem chi tiết
                          <span className="sr-only">
                            {" "}
                            bài nộp {item.exercise.title}
                          </span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={history.page} totalPages={history.totalPages} />
        </section>
      )}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;
  const href = (target: number) =>
    target === 1 ? "/hv/submissions" : `/hv/submissions?page=${target}`;
  return (
    <nav
      aria-label="Phân trang"
      className="flex items-center justify-between gap-3 border-t px-5 py-3"
    >
      {page > 1 ? (
        <Button asChild variant="outline" size="sm">
          <Link href={href(page - 1)} rel="prev">
            Trang trước
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          Trang trước
        </Button>
      )}
      <p className="text-sm text-muted-foreground" aria-current="page">
        Trang {page} / {totalPages}
      </p>
      {page < totalPages ? (
        <Button asChild variant="outline" size="sm">
          <Link href={href(page + 1)} rel="next">
            Trang sau
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          Trang sau
        </Button>
      )}
    </nav>
  );
}
