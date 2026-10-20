export default function ContestsLoading() {
  return (
    <div role="status" className="mx-auto max-w-6xl animate-pulse space-y-6">
      <span className="sr-only">Đang tải cuộc thi...</span>
      <div className="h-44 rounded-3xl bg-secondary/50" />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((key) => (
          <div key={key} className="h-72 rounded-2xl border bg-muted" />
        ))}
      </div>
    </div>
  );
}
