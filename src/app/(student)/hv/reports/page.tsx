import Link from "next/link";
import { getMyReports } from "@/features/exercise-reports/handling-service";
import { markReportNotificationsReadAction } from "@/features/exercise-reports/handling-actions";
import { ReportCard } from "@/features/exercise-reports/components/report-card";
import { ReportPagination } from "@/features/exercise-reports/components/report-pagination";
import { ReportRefresh } from "@/features/exercise-reports/components/report-refresh";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Báo lỗi của tôi | Code Carf" };
export default async function MyReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; report?: string }>;
}) {
  const params = await searchParams;
  const data = await getMyReports(
    params.page,
    typeof params.report === "string" ? params.report : undefined,
  );
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold text-primary">Báo lỗi của tôi</h1>
      <div className="flex flex-wrap items-center gap-3">
        <p role="status" className="text-sm">
          {data.unread} thông báo xử lý chưa đọc
        </p>
        <ReportRefresh />
        {data.unread > 0 && (
          <form action={markReportNotificationsReadAction}>
            <Button variant="outline">Đánh dấu tất cả đã đọc</Button>
          </form>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Trang tự cập nhật mỗi 30 giây khi đang mở. Bạn chỉ xem được báo lỗi do
        mình gửi.
      </p>
      {params.report && (
        <Link
          href="/hv/reports"
          className="inline-block text-sm text-primary underline"
        >
          Xem tất cả báo lỗi của tôi
        </Link>
      )}
      {!data.reports.length && (
        <p role="status" className="rounded-xl border bg-background p-6">
          Không có báo lỗi để hiển thị.
        </p>
      )}
      {data.reports.map((report) => (
        <ReportCard key={report.id} report={report} />
      ))}
      {!params.report && (
        <ReportPagination
          page={data.page}
          pages={data.pages}
          base="/hv/reports"
        />
      )}
    </div>
  );
}
