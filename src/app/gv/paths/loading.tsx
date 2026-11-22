export default function ManagedPathsLoading() {
  return (
    <div
      role="status"
      aria-label="Đang tải danh sách lộ trình"
      className="mx-auto w-full max-w-7xl space-y-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2.5">
          <div className="h-3.5 w-32 animate-pulse rounded-full bg-muted" />
          <div className="h-8 w-56 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-80 max-w-full animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="h-10 w-36 animate-pulse rounded-xl bg-muted" />
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-2xl border border-border/70 bg-background"
          >
            <div className="h-20 animate-pulse bg-muted" />
            <div className="space-y-3 p-5">
              <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
              <div className="space-y-1.5">
                <div className="h-3.5 w-full animate-pulse rounded bg-muted" />
                <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted" />
              </div>
              <div className="flex gap-2 pt-1">
                <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
                <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-5 py-3">
              <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
              <div className="h-8 w-20 animate-pulse rounded-lg bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
