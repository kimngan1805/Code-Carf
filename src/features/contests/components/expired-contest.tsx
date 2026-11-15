"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useContestFinalization } from "./use-contest-finalization";

export function FinalizationNotice({
  finalization,
}: {
  finalization: ReturnType<typeof useContestFinalization>;
}) {
  const { result, error } = finalization;
  return (
    <div role="status" className="rounded-xl border bg-background p-4 text-sm">
      {error ? (
        <p className="text-warning">
          {error} Bản nháp trên trình duyệt vẫn được giữ; hệ thống chỉ chốt code
          đã lưu trên máy chủ trước hạn.
        </p>
      ) : !result ? (
        <p className="text-primary">Đã hết giờ. Đang xác nhận bài tự nộp...</p>
      ) : !result.submission ? (
        <p className="text-muted-foreground">
          Lượt thi đã kết thúc. Không có bản nháp hợp lệ đã đồng bộ để tự nộp.
        </p>
      ) : (
        <div className="space-y-2">
          <p className="font-semibold text-primary">
            {["PENDING", "RUNNING"].includes(result.submission.status)
              ? "Bài đang mở đã được ghi nhận và đang chấm."
              : "Bài đang mở đã được ghi nhận. Lượt thi đã kết thúc."}
          </p>
          <p className="text-muted-foreground">
            {result.submission.feedback ?? "Đang chấm bài..."}
          </p>
        </div>
      )}
    </div>
  );
}

export function ExpiredContest({
  slug,
  title,
  completed = false,
}: {
  slug: string;
  title: string;
  completed?: boolean;
}) {
  const finalization = useContestFinalization(slug, true);
  return (
    <section className="mx-auto max-w-2xl space-y-5 rounded-2xl border bg-background p-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-sm text-muted-foreground">
        {completed
          ? "Bạn đã nộp tất cả bài và hoàn thành lượt thi."
          : "Lượt làm bài của bạn đã hết giờ. Bạn không thể sửa hoặc nộp thêm bài mới."}
      </p>
      <FinalizationNotice finalization={finalization} />
      <Button asChild variant="outline">
        <Link href="/contests">Về danh sách cuộc thi</Link>
      </Button>
    </section>
  );
}
