export default function ExerciseLoading() {
  return (
    <div
      role="status"
      aria-label="Đang tải bài tập"
      className="mx-auto max-w-7xl space-y-6"
    >
      <span className="sr-only">Đang tải bài tập...</span>
      <div aria-hidden className="animate-pulse space-y-6">
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="h-9 w-2/3 rounded bg-muted" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-96 rounded-2xl border bg-muted/50" />
          <div className="h-96 rounded-2xl border bg-muted/50" />
        </div>
      </div>
    </div>
  );
}
