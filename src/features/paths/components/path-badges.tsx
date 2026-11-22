import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { DIFFICULTY_LABELS } from "../cover-themes";

export type PathDifficulty = keyof typeof DIFFICULTY_LABELS;

const difficultyStyles: Record<PathDifficulty, string> = {
  EASY: "border-secondary bg-secondary/70 text-secondary-foreground",
  MEDIUM: "border-highlight/30 bg-highlight/15 text-primary",
  HARD: "border-accent/30 bg-accent/15 text-accent-strong",
};

export function PathStatusBadge({
  published,
  surface = "default",
  className,
}: {
  published: boolean;
  /** Dùng `elevated` khi đặt trên ảnh bìa gradient để đảm bảo tương phản WCAG AA. */
  surface?: "default" | "elevated";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        surface === "elevated"
          ? published
            ? "border-success/30 bg-background/95 text-success shadow-xs backdrop-blur-xs"
            : "border-warning/30 bg-background/95 text-warning shadow-xs backdrop-blur-xs"
          : published
            ? "border-success/25 bg-success/10 text-success"
            : "border-warning/25 bg-warning/10 text-warning",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          published ? "bg-success" : "bg-warning",
        )}
      />
      {published ? "Đã xuất bản" : "Bản nháp"}
    </span>
  );
}

export function PathDifficultyBadge({
  difficulty,
  surface = "default",
  className,
}: {
  difficulty: PathDifficulty;
  surface?: "default" | "elevated";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        surface === "elevated"
          ? "border-border/60 bg-background/95 text-primary shadow-xs backdrop-blur-xs"
          : difficultyStyles[difficulty],
        className,
      )}
    >
      {DIFFICULTY_LABELS[difficulty]}
    </span>
  );
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function PathBreadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Đường dẫn" className="min-w-0">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-muted-foreground sm:text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li
              key={`${item.label}-${index}`}
              className="flex min-w-0 items-center gap-1.5"
            >
              {index > 0 && (
                <ChevronRight
                  aria-hidden
                  className="size-3.5 shrink-0 text-muted-foreground/60"
                />
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="truncate rounded transition-colors hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={cn(
                    "truncate",
                    isLast ? "font-semibold text-foreground" : "",
                  )}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
