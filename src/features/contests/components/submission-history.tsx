import { languages } from "../languages";
import { cn } from "@/lib/utils";
import type { AttemptReview } from "@/features/proctoring/review";

const resultLabels: Record<string, string> = {
  MOCKED: "Đã chấm · mô phỏng",
  PENDING: "Chờ chấm",
  RUNNING: "Đang chấm",
  ACCEPTED: "Đúng",
  REJECTED: "Chưa đúng",
  ERROR: "Lỗi chấm",
  NEEDS_REVIEW: "Chờ duyệt",
};

export function SubmissionHistory({
  submissions,
}: {
  submissions: AttemptReview["submissions"];
}) {
  return (
    <section
      className="overflow-hidden rounded-2xl border bg-background"
      aria-labelledby="submission-history-title"
    >
      <h2
        id="submission-history-title"
        className="border-b px-5 py-4 font-bold"
      >
        Bài nộp gần đây của bạn
      </h2>
      {submissions.length === 0 ? (
        <p className="p-5 text-sm text-muted-foreground">
          Bạn chưa nộp bài nào trong cuộc thi này.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-xs text-muted-foreground">
              <tr>
                {["Bài", "Ngôn ngữ", "Trạng thái", "Điểm", "Thời gian"].map(
                  (label) => (
                    <th scope="col" key={label} className="px-5 py-3">
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {submissions.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-3">
                    {item.exercise.title}
                    {item.autoSubmitted && (
                      <span className="ml-2 rounded-full bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground">
                        Tự nộp
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {languages.find((language) => language.id === item.language)
                      ?.label ??
                      item.language ??
                      "—"}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      title={item.feedback ?? undefined}
                      className={cn(
                        "font-semibold",
                        item.status === "ACCEPTED"
                          ? "text-success"
                          : "text-primary",
                      )}
                    >
                      {item.feedback?.toLowerCase().includes("mock") ||
                      item.feedback?.includes("mô phỏng")
                        ? resultLabels.MOCKED
                        : (resultLabels[item.status] ?? item.status)}
                    </span>
                  </td>
                  <td className="px-5 py-3">{item.score ?? "—"}</td>
                  <td className="whitespace-nowrap px-5 py-3">
                    {new Intl.DateTimeFormat("vi-VN", {
                      timeZone: "Asia/Ho_Chi_Minh",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    }).format(new Date(item.createdAt))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
