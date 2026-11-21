import Link from "next/link";
import type { listReportPage } from "../handling-repository";
import { REPORT_STATUS_LABELS } from "../handling-rules";
import { REPORT_KINDS } from "../rules";
import { ReportHandlingForm } from "./handling-form";

type Report = Awaited<ReturnType<typeof listReportPage>>["reports"][number];
export function ReportCard({
  report,
  teacher = false,
}: {
  report: Report;
  teacher?: boolean;
}) {
  return (
    <article
      id={report.id}
      className="min-w-0 scroll-mt-20 space-y-3 rounded-2xl border bg-background p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="min-w-0 text-lg font-semibold break-words">
          {report.exercise.title}
        </h2>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-primary">
          {REPORT_STATUS_LABELS[report.status]}
        </span>
      </div>
      <p className="text-sm break-words text-muted-foreground">
        {report.room.path.title} · {report.room.title}
      </p>
      <p className="text-xs text-muted-foreground">
        {REPORT_KINDS.find((item) => item.value === report.kind)?.label} ·{" "}
        {new Intl.DateTimeFormat("vi-VN", {
          dateStyle: "medium",
          timeZone: "Asia/Ho_Chi_Minh",
        }).format(report.createdAt)}
        {teacher ? ` · Học viên: ${report.user.name}` : ""}
      </p>
      <p className="text-sm whitespace-pre-wrap break-words">
        {report.description}
      </p>
      {report.resolution && (
        <div className="rounded-xl bg-muted p-3">
          <h3 className="text-sm font-semibold">Kết quả xử lý</h3>
          <p className="mt-1 text-sm whitespace-pre-wrap break-words">
            {report.resolution}
          </p>
        </div>
      )}
      {teacher && (
        <Link
          className="inline-block text-sm font-medium text-primary underline"
          href={`/gv/paths/${report.room.path.slug}/rooms/${report.room.id}`}
        >
          Xem bài học
        </Link>
      )}
      {teacher && report.status !== "RESOLVED" && (
        <ReportHandlingForm
          key={`${report.id}-${report.version}`}
          id={report.id}
          status={report.status}
          version={report.version}
        />
      )}
    </article>
  );
}
