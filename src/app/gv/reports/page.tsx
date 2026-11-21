import { getManagedReports } from "@/features/exercise-reports/handling-service";
import {
  REPORT_STATUSES,
  REPORT_STATUS_LABELS,
} from "@/features/exercise-reports/handling-rules";
import { ReportCard } from "@/features/exercise-reports/components/report-card";
import { ReportPagination } from "@/features/exercise-reports/components/report-pagination";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Xử lý báo lỗi | Code Carf" };
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const data = await getManagedReports(params.status, params.page);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold text-primary">Xử lý báo lỗi</h1>
      <p className="text-sm text-muted-foreground">
        Báo lỗi thuộc nội dung bạn được quản lý. Khi xác nhận đã xử lý, học viên
        gửi báo lỗi sẽ nhận thông báo.
      </p>
      <form className="flex flex-wrap items-end gap-3" action="/gv/reports">
        <label className="space-y-1 text-sm font-medium">
          Lọc trạng thái
          <select
            name="status"
            defaultValue={data.filter ?? ""}
            className="ml-2 h-10 rounded-xl border bg-background px-3 focus-visible:outline-2"
          >
            <option value="">Tất cả</option>
            {REPORT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {REPORT_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="outline">
          Lọc
        </Button>
      </form>
      <p className="text-sm">{data.total} báo lỗi</p>
      {!data.reports.length && (
        <p role="status" className="rounded-xl border bg-background p-6">
          Không có báo lỗi phù hợp.
        </p>
      )}
      {data.reports.map((report) => (
        <ReportCard key={report.id} report={report} teacher />
      ))}
      <ReportPagination
        page={data.page}
        pages={data.pages}
        base="/gv/reports"
        status={data.filter}
      />
    </div>
  );
}
