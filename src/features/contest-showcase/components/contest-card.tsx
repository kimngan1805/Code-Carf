import { formatContestDate, type ContestPhase } from "@/features/contests/time";

export const showcaseLabels: Record<ContestPhase, string> = {
  upcoming: "Sắp diễn ra",
  live: "Đang diễn ra",
  ended: "Đã kết thúc",
  unscheduled: "Chờ công bố lịch",
};
const tones: Record<ContestPhase, string> = {
  upcoming: "bg-secondary/60 text-primary",
  live: "bg-success/10 text-success",
  ended: "bg-muted text-muted-foreground",
  unscheduled: "bg-warning/10 text-warning",
};
export function PublicPhase({ phase }: { phase: ContestPhase }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${tones[phase]}`}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {showcaseLabels[phase]}
    </span>
  );
}
export function PublicDate({ value }: { value: string | null }) {
  return <>{formatContestDate(value ? new Date(value) : null)}</>;
}
