import Link from "next/link";
import {
  ArrowRight,
  Award,
  CalendarCheck2,
  Check,
  Flame,
  GraduationCap,
  Lock,
  Medal,
  Shield,
  Sparkles,
  Star,
  Target,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { LevelInfo } from "@/features/progress/levels";
import { cn } from "@/lib/utils";
import {
  formatAwardedDate,
  type AchievementsSummary,
  type EarnedBadgeItem,
  type LockedBadgeItem,
} from "../service";

const numberFormat = new Intl.NumberFormat("vi-VN");

const slugIconMap: Record<string, LucideIcon> = {
  "first-step": Star,
  "streak-7": Flame,
  "first-path-room": Medal,
  "fast-solver": Trophy,
  "night-owl": Shield,
};

const fallbackIcons: LucideIcon[] = [Award, Medal, Shield, Star, Flame, Trophy];

function BadgeIcon({
  slug,
  index = 0,
  className,
}: {
  slug: string;
  index?: number;
  className?: string;
}) {
  const Icon = slugIconMap[slug] ?? fallbackIcons[index % fallbackIcons.length];
  return <Icon className={className} aria-hidden />;
}

/** Pastel icon tones matching the Student Dashboard. */
const toneTiles = [
  "bg-accent/15 text-accent-strong",
  "bg-secondary/70 text-primary",
  "bg-highlight/20 text-primary",
];

function Panel({
  className,
  children,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "rounded-[1.75rem] border border-border/60 bg-background p-5",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

export function AchievementsHeader({
  summary,
}: {
  summary: AchievementsSummary;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Thành tích
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hành trình tích lũy XP, cấp độ và bộ sưu tập huy hiệu của bạn.
        </p>
      </div>
      <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-background px-4 py-2 text-sm font-semibold text-primary tabular-nums">
        <Trophy className="size-4" aria-hidden />
        {summary.earnedCount}/{summary.totalCount} huy hiệu
      </span>
    </div>
  );
}

export function AchievementsJourneySection({
  level,
  summary,
}: {
  level: LevelInfo;
  summary: AchievementsSummary;
}) {
  const kpis = [
    {
      label: "Tổng XP",
      value: numberFormat.format(level.xp),
      helper: "điểm kinh nghiệm",
      icon: Zap,
      surface: "bg-highlight/10",
      tile: "bg-highlight/20 text-primary",
      spanClass: "",
    },
    {
      label: "Cấp độ",
      value: `Level ${level.level}`,
      helper: level.title,
      icon: GraduationCap,
      surface: "bg-secondary/40",
      tile: "bg-secondary/70 text-primary",
      spanClass: "",
    },
    {
      label: "Huy hiệu",
      value: `${summary.earnedCount}/${summary.totalCount}`,
      helper: `${summary.completionPercent}% bộ sưu tập`,
      icon: Award,
      surface: "bg-accent/10",
      tile: "bg-accent/15 text-accent-strong",
      spanClass: "col-span-2 sm:col-span-1",
    },
  ];

  const levelProgressPercent = Math.round(
    Math.min(1, Math.max(0, level.progress)) * 100,
  );

  return (
    <Panel
      aria-labelledby="journey-heading"
      className="flex h-full flex-col justify-between"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-secondary/60 text-primary">
            <GraduationCap className="size-4" aria-hidden />
          </span>
          <h2 id="journey-heading" className="text-sm font-semibold">
            Hành trình của bạn
          </h2>
        </div>
        <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
          Level {level.level} · {level.title}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={cn(
              "flex min-w-0 flex-col rounded-2xl p-3.5",
              kpi.surface,
              kpi.spanClass,
            )}
          >
            <span
              aria-hidden
              className={cn(
                "grid size-7 place-items-center rounded-lg",
                kpi.tile,
              )}
            >
              <kpi.icon className="size-4" />
            </span>
            <dd className="mt-2.5 text-2xl leading-tight font-semibold tracking-tight tabular-nums">
              {kpi.value}
            </dd>
            <dt className="mt-0.5 truncate text-xs text-muted-foreground">
              {kpi.label} · {kpi.helper}
            </dt>
          </div>
        ))}
      </dl>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-muted/70 p-3.5">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold">
            <span>Tiến độ lên cấp</span>
            <span className="text-primary tabular-nums">
              {levelProgressPercent}%
            </span>
          </div>
          <Progress
            value={level.progress}
            label="Tiến độ lên cấp"
            className="mt-2 bg-background"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {level.nextXp === null
              ? "Bạn đã đạt cấp cao nhất. Tiếp tục giữ phong độ nhé!"
              : `Còn ${numberFormat.format(level.nextXp - level.xp)} XP nữa để lên cấp tiếp theo.`}
          </p>
        </div>

        <div className="rounded-2xl bg-muted/70 p-3.5">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold">
            <span>Tiến độ huy hiệu</span>
            <span className="text-accent-strong tabular-nums">
              {summary.completionPercent}%
            </span>
          </div>
          <Progress
            value={summary.progress}
            label="Tiến độ mở khóa huy hiệu"
            className="mt-2 bg-background"
            barClassName="bg-accent-strong"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {summary.totalCount === 0
              ? "Hệ thống chưa có huy hiệu nào."
              : summary.lockedCount === 0
                ? `Đã mở khóa đủ ${summary.totalCount}/${summary.totalCount} huy hiệu.`
                : `Còn ${summary.lockedCount} huy hiệu chưa mở khóa.`}
          </p>
        </div>
      </div>
    </Panel>
  );
}

export function NextBadgeGoalSection({
  nextGoal,
  totalCount,
}: {
  nextGoal: LockedBadgeItem | null;
  totalCount: number;
}) {
  const isCompleted = !nextGoal && totalCount > 0;
  const headingText = isCompleted
    ? "Bộ sưu tập hoàn tất"
    : "Mục tiêu tiếp theo";

  return (
    <section
      aria-labelledby="next-goal-heading"
      className="flex h-full flex-col justify-between rounded-[1.75rem] border border-border/60 bg-gradient-to-b from-secondary/45 via-background to-accent/10 p-5"
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "grid size-9 place-items-center rounded-xl",
                isCompleted
                  ? "bg-success/15 text-success"
                  : "bg-accent/15 text-accent-strong",
              )}
            >
              {isCompleted ? (
                <Trophy className="size-4" aria-hidden />
              ) : (
                <Target className="size-4" aria-hidden />
              )}
            </span>
            <h2 id="next-goal-heading" className="text-sm font-semibold">
              {headingText}
            </h2>
          </div>
          {isCompleted && (
            <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-[11px] font-semibold text-success tabular-nums">
              100%
            </span>
          )}
        </div>

        {nextGoal ? (
          <div className="mt-4 rounded-2xl border border-border/60 bg-background p-4">
            <div className="flex items-center gap-3.5">
              <span className="relative grid size-12 shrink-0 place-items-center rounded-2xl bg-secondary/70 text-primary">
                <BadgeIcon slug={nextGoal.slug} className="size-6" />
                <span className="absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full bg-background text-muted-foreground ring-1 ring-border">
                  <Lock className="size-3" aria-hidden />
                </span>
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-accent-strong">
                  Huy hiệu sắp mở
                </p>
                <h3 className="mt-0.5 truncate text-base font-semibold">
                  {nextGoal.name}
                </h3>
              </div>
            </div>

            <div className="mt-3.5 rounded-xl bg-muted/60 px-3.5 py-2.5">
              <p className="text-[11px] font-semibold text-muted-foreground">
                Điều kiện đạt được
              </p>
              <p className="mt-0.5 text-sm leading-5 font-medium text-foreground">
                {nextGoal.description}
              </p>
            </div>
          </div>
        ) : isCompleted ? (
          <div className="mt-4 rounded-2xl border border-border/60 bg-background p-4">
            <p className="text-base font-semibold">
              Bạn đã chinh phục tất cả {totalCount} huy hiệu
            </p>
            <p className="mt-1.5 text-xs leading-5 text-muted-foreground sm:text-sm">
              Tiếp tục hoàn thành các bài học và cuộc thi để giữ chuỗi ngày học
              và tích lũy thêm XP.
            </p>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-border/60 bg-background p-4">
            <p className="text-sm font-semibold">Chưa có huy hiệu khả dụng</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Các huy hiệu mới sẽ sớm được cập nhật. Bạn vẫn có thể học các lộ
              trình để tích lũy XP.
            </p>
          </div>
        )}
      </div>

      <Button asChild className="mt-4 w-full rounded-full">
        <Link href="/hv/paths">
          Tiếp tục học
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </Button>
    </section>
  );
}

export function EarnedBadgesSection({ badges }: { badges: EarnedBadgeItem[] }) {
  return (
    <Panel aria-labelledby="earned-badges-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-secondary/60 text-primary">
            <Award className="size-4" aria-hidden />
          </span>
          <div>
            <h2 id="earned-badges-heading" className="text-sm font-semibold">
              Huy hiệu đã nhận
            </h2>
            <p className="text-xs text-muted-foreground">
              Các cột mốc bạn đã hoàn thành
            </p>
          </div>
        </div>
        <span className="rounded-full bg-secondary/50 px-3 py-1 text-xs font-semibold text-primary tabular-nums">
          {badges.length} huy hiệu
        </span>
      </div>

      {badges.length === 0 ? (
        <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-secondary/25 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-background text-primary">
              <Sparkles className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-sm font-semibold">
                Chưa có huy hiệu nào được mở khóa
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Hoàn thành bài tập đầu tiên trong lộ trình để nhận huy hiệu khởi
                đầu.
              </p>
            </div>
          </div>
          <Button
            asChild
            size="sm"
            className="shrink-0 self-start rounded-full px-4 sm:self-auto"
          >
            <Link href="/hv/paths">
              Tiếp tục học
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {badges.map((badge, index) => {
            const tileTone = toneTiles[index % toneTiles.length];
            return (
              <li key={badge.id}>
                <article className="flex h-full flex-col justify-between rounded-3xl border border-border/60 bg-background p-4 transition-shadow hover:shadow-lg hover:shadow-primary/10">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={cn(
                          "grid size-12 shrink-0 place-items-center rounded-2xl",
                          tileTone,
                        )}
                      >
                        <BadgeIcon
                          slug={badge.slug}
                          index={index}
                          className="size-6"
                        />
                      </span>
                      <span
                        title="Đã nhận"
                        aria-label="Đã nhận"
                        className="grid size-6 shrink-0 place-items-center rounded-full bg-success/15 text-success"
                      >
                        <Check className="size-3.5" aria-hidden />
                      </span>
                    </div>

                    <h3 className="mt-3.5 text-base font-semibold">
                      {badge.name}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {badge.description}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center gap-1.5 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                    <CalendarCheck2
                      className="size-3.5 shrink-0 text-primary"
                      aria-hidden
                    />
                    <span>
                      Nhận ngày{" "}
                      <time
                        dateTime={badge.awardedAt.toISOString()}
                        className="font-semibold text-foreground tabular-nums"
                      >
                        {formatAwardedDate(badge.awardedAt)}
                      </time>
                    </span>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

export function LockedBadgesSection({
  badges,
  totalCount,
  nextGoalId,
}: {
  badges: LockedBadgeItem[];
  totalCount: number;
  nextGoalId?: string | null;
}) {
  return (
    <Panel aria-labelledby="locked-badges-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-muted text-muted-foreground">
            <Lock className="size-4" aria-hidden />
          </span>
          <div>
            <h2 id="locked-badges-heading" className="text-sm font-semibold">
              Huy hiệu chưa mở khóa
            </h2>
            <p className="text-xs text-muted-foreground">
              Hoàn thành điều kiện bên dưới để sưu tầm thêm huy hiệu
            </p>
          </div>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground tabular-nums">
          {badges.length} huy hiệu
        </span>
      </div>

      {badges.length === 0 ? (
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
          <Check className="size-4 shrink-0 text-success" aria-hidden />
          <p>
            {totalCount > 0
              ? "Không còn huy hiệu nào đang khóa."
              : "Chưa có huy hiệu nào trong hệ thống."}
          </p>
        </div>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {badges.map((badge, index) => {
            const isNextGoal = badge.id === nextGoalId;
            return (
              <li key={badge.id}>
                <article
                  className={cn(
                    "flex h-full flex-col justify-between rounded-3xl border border-dashed p-4",
                    isNextGoal
                      ? "border-primary/40 bg-secondary/10"
                      : "border-border bg-muted/25",
                  )}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={cn(
                          "relative grid size-12 shrink-0 place-items-center rounded-2xl",
                          isNextGoal
                            ? "bg-secondary/60 text-primary"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        <BadgeIcon
                          slug={badge.slug}
                          index={index}
                          className="size-6"
                        />
                        <span
                          aria-label="Chưa mở khóa"
                          className="absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full bg-background text-muted-foreground ring-1 ring-border"
                        >
                          <Lock className="size-3" aria-hidden />
                        </span>
                      </span>
                      {isNextGoal && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary/60 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                          <Target className="size-3" aria-hidden />
                          Mục tiêu tiếp theo
                        </span>
                      )}
                    </div>

                    <h3 className="mt-3.5 text-base font-semibold text-foreground">
                      {badge.name}
                    </h3>
                  </div>

                  <div className="mt-4 rounded-2xl bg-background px-3.5 py-2.5 text-xs">
                    <p className="font-semibold text-muted-foreground">
                      Điều kiện mở khóa
                    </p>
                    <p className="mt-0.5 leading-5 font-medium text-foreground">
                      {badge.description}
                    </p>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
