export default function ShowcaseLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Đang tải thông tin thi đấu"
      className="mx-auto max-w-6xl space-y-8 px-4 py-16 sm:px-6"
    >
      <p role="status" className="text-sm text-muted-foreground">
        Đang chuẩn bị sân chơi cho bạn...
      </p>
      <div className="h-64 animate-pulse rounded-3xl bg-secondary/40" />
      <div className="grid gap-6 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-64 animate-pulse rounded-3xl bg-muted" />
        ))}
      </div>
    </main>
  );
}
