export default function LeaderboardLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-5" aria-busy="true">
      <div className="grid gap-5 rounded-[1.75rem] border border-border/60 bg-background p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-3">
          <div className="h-6 w-48 animate-pulse rounded-full bg-muted" />
          <div className="h-9 w-64 animate-pulse rounded-xl bg-muted" />
          <div className="h-4 w-72 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-36 animate-pulse rounded-3xl bg-secondary/30" />
      </div>

      <div className="h-28 animate-pulse rounded-[1.75rem] border border-border/60 bg-muted/35" />

      <div className="grid gap-3 rounded-[1.75rem] border border-border/60 bg-background p-4 sm:grid-cols-3 sm:p-6">
        <div className="h-48 animate-pulse rounded-3xl bg-secondary/30" />
        <div className="h-56 animate-pulse rounded-3xl bg-accent/15" />
        <div className="h-44 animate-pulse rounded-3xl bg-highlight/15" />
      </div>

      <div className="space-y-1.5 rounded-[1.75rem] border border-border/60 bg-background p-5">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-14 animate-pulse rounded-2xl bg-muted/45"
          />
        ))}
      </div>
    </div>
  );
}
