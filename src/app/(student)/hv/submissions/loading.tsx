export default function SubmissionsLoading() {
  return (
    <div
      role="status"
      aria-label="Đang tải lịch sử nộp bài"
      className="mx-auto max-w-5xl space-y-6"
    >
      <span className="sr-only">Đang tải lịch sử nộp bài...</span>
      <div aria-hidden className="animate-pulse space-y-6">
        <div className="h-8 w-56 rounded bg-muted" />
        <div className="h-80 rounded-2xl border bg-muted/50" />
      </div>
    </div>
  );
}
