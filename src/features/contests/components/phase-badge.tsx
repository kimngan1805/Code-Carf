import { cn } from "@/lib/utils";
import { phaseLabels, type ContestPhase } from "../time";

export function PhaseBadge({ phase }: { phase: ContestPhase }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
        phase === "live"
          ? "bg-success/10 text-success"
          : phase === "upcoming"
            ? "bg-secondary text-secondary-foreground"
            : "bg-muted text-muted-foreground",
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {phaseLabels[phase]}
    </span>
  );
}
