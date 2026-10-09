import { cn } from "@/lib/utils";

export function Progress({
  value,
  label,
  className,
  barClassName = "bg-primary",
}: {
  /** 0 to 1 */
  value: number;
  label: string;
  className?: string;
  barClassName?: string;
}) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      <div
        className={cn("h-full rounded-full transition-all", barClassName)}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
