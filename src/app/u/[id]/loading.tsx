export default function PublicProfileLoading() {
  return (
    <div role="status" className="animate-pulse space-y-6">
      <span className="sr-only">Đang tải hồ sơ học viên...</span>
      <div className="h-40 rounded-[1.75rem] bg-secondary/40" />
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="h-64 rounded-[1.75rem] border border-border/60 bg-background p-5 lg:col-span-7">
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((key) => (
              <div key={key} className="h-24 rounded-3xl bg-muted" />
            ))}
          </div>
        </div>
        <div className="h-64 rounded-[1.75rem] border border-border/60 bg-background p-5 lg:col-span-5">
          <div className="h-full rounded-2xl bg-muted" />
        </div>
      </div>
      <div className="h-48 rounded-[1.75rem] border border-border/60 bg-background" />
    </div>
  );
}
