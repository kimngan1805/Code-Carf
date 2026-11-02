export default function RoomLoading() {
  return (
    <div
      role="status"
      aria-label="Đang tải bài học"
      className="mx-auto max-w-5xl space-y-6"
    >
      <span className="sr-only">Đang tải bài học...</span>
      <div aria-hidden className="animate-pulse space-y-6">
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="h-9 w-2/3 rounded bg-muted" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="h-64 rounded-2xl border bg-muted/50" />
          <div className="h-64 rounded-2xl border bg-muted/50" />
        </div>
        <div className="h-28 rounded-2xl border bg-muted/50" />
        <div className="h-28 rounded-2xl border bg-muted/50" />
      </div>
    </div>
  );
}
