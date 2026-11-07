import Link from "next/link";
import {
  Award,
  BookOpen,
  Calendar,
  Crown,
  Medal,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getLevel } from "@/features/progress/levels";
import { APP_TIME_ZONE } from "@/features/progress/week-activity";
import { cn } from "@/lib/utils";
import type { XpLeaderboardView } from "../service";
import type {
  CurrentUserStanding,
  LeaderboardPeriod,
  RankedXpLearner,
} from "../xp-ranking";

const numberFormat = new Intl.NumberFormat("vi-VN");

const shortDateFormat = new Intl.DateTimeFormat("vi-VN", {
  timeZone: APP_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
});

export function buildLeaderboardHref(
  period: LeaderboardPeriod,
  pathSlug?: string | null,
): string {
  const params = new URLSearchParams();
  if (period === "week") {
    params.set("period", "week");
  }
  if (pathSlug) {
    params.set("path", pathSlug);
  }
  const query = params.toString();
  return query ? `/leaderboard?${query}` : "/leaderboard";
}

export function getAvatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const first = parts[0][0] ?? "";
  const last = parts[parts.length - 1][0] ?? "";
  return `${first}${last}`.toUpperCase();
}

function formatWeekLabel(startsAt: Date, endsAt: Date): string {
  const inclusiveEnd = new Date(endsAt.getTime() - 1);
  return `${shortDateFormat.format(startsAt)} – ${shortDateFormat.format(inclusiveEnd)}`;
}

function AvatarBadge({
  name,
  tone = "muted",
  size = "md",
  className,
}: {
  name: string;
  tone?: "peach" | "sky" | "cyan" | "muted";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const toneClass =
    tone === "peach"
      ? "bg-accent/15 text-accent-strong ring-4 ring-background/90"
      : tone === "sky"
        ? "bg-secondary/80 text-primary ring-4 ring-background/90"
        : tone === "cyan"
          ? "bg-highlight/20 text-primary ring-4 ring-background/90"
          : "bg-muted text-muted-foreground";

  const sizeClass =
    size === "lg"
      ? "size-14 text-base"
      : size === "md"
        ? "size-11 text-sm"
        : "size-9 text-xs";

  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-bold tracking-tight select-none",
        toneClass,
        sizeClass,
        className,
      )}
    >
      {getAvatarInitials(name)}
    </span>
  );
}

function MyStandingCard({
  standing,
  totalRankedLearners,
  leaderXp,
}: {
  standing: CurrentUserStanding;
  totalRankedLearners: number;
  leaderXp: number;
}) {
  const level = getLevel(standing.xp);
  const ratio =
    leaderXp > 0 && standing.xp > 0 ? Math.min(1, standing.xp / leaderXp) : 0;
  const percentOfLeader = Math.round(ratio * 100);

  return (
    <Link
      href="/hv/profile"
      aria-labelledby="my-standing-heading"
      className="group block rounded-3xl border border-border/50 bg-gradient-to-b from-secondary/45 via-secondary/15 to-accent/10 p-4 transition-colors hover:border-primary/25 focus-visible:outline-2 focus-visible:outline-offset-2 sm:p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <span
          id="my-standing-heading"
          className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-primary uppercase"
        >
          <Sparkles className="size-3.5 text-accent" aria-hidden />
          Thứ hạng của bạn
        </span>
        {standing.rank !== null && totalRankedLearners > 0 ? (
          <span className="rounded-full bg-background/90 px-2.5 py-0.5 text-xs font-bold text-primary shadow-xs tabular-nums">
            #{standing.rank} / {numberFormat.format(totalRankedLearners)}
          </span>
        ) : (
          <span className="rounded-full bg-background/90 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground shadow-xs">
            Chưa có hạng
          </span>
        )}
      </div>

      <div className="mt-3.5 flex items-center gap-3">
        <AvatarBadge
          name={standing.name}
          tone={standing.rank === 1 ? "peach" : "sky"}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-foreground">
            {standing.name}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {standing.rank === null
              ? "Chưa có XP trong bộ lọc này"
              : `Level ${level.level} · ${level.title}`}
          </p>
        </div>
        <div className="shrink-0 rounded-2xl bg-background/85 px-3 py-1.5 text-right shadow-xs">
          <p className="text-base font-bold text-foreground tabular-nums">
            {numberFormat.format(standing.xp)}
          </p>
          <p className="-mt-0.5 text-[10px] font-semibold text-muted-foreground uppercase">
            XP
          </p>
        </div>
      </div>

      <div className="mt-3.5 space-y-1.5">
        <Progress
          value={ratio}
          label={`XP của bạn so với người dẫn đầu (${percentOfLeader}%)`}
          className="h-1.5 bg-background/85"
          barClassName={standing.rank === 1 ? "bg-accent" : "bg-primary"}
        />
        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span>
            {standing.rank === 1
              ? "Đang dẫn đầu bảng xếp hạng"
              : standing.rank !== null && leaderXp > 0
                ? `Đạt ${percentOfLeader}% XP so với hạng #1`
                : "Hoàn thành bài học để tích lũy XP"}
          </span>
          <span className="shrink-0 font-semibold text-primary group-hover:underline">
            Hồ sơ →
          </span>
        </div>
      </div>
    </Link>
  );
}

function getPodiumVisual(rank: number) {
  if (rank === 1) {
    return {
      card: "border-accent/25 bg-accent/10 hover:bg-accent/15 shadow-xs sm:pt-7 sm:pb-6",
      badge: "bg-background/95 text-accent-strong shadow-xs",
      iconColor: "text-accent",
      avatarTone: "peach" as const,
      avatarSize: "lg" as const,
      bar: "bg-accent",
      icon: Crown,
      xpColor: "text-accent-strong",
    };
  }
  if (rank === 2) {
    return {
      card: "border-secondary/80 bg-secondary/35 hover:bg-secondary/50 sm:pt-5 sm:pb-5",
      badge: "bg-background/95 text-primary shadow-xs",
      iconColor: "text-primary",
      avatarTone: "sky" as const,
      avatarSize: "md" as const,
      bar: "bg-primary",
      icon: Medal,
      xpColor: "text-primary",
    };
  }
  return {
    card: "border-highlight/25 bg-highlight/10 hover:bg-highlight/15 sm:pt-4 sm:pb-4",
    badge: "bg-background/95 text-primary shadow-xs",
    iconColor: "text-primary",
    avatarTone: "cyan" as const,
    avatarSize: "md" as const,
    bar: "bg-highlight",
    icon: Award,
    xpColor: "text-foreground",
  };
}

function getDesktopPodiumOrderClass(index: number, count: number): string {
  if (count < 3) return "";
  if (index === 0) return "sm:order-2";
  if (index === 1) return "sm:order-1";
  return "sm:order-3";
}

function PodiumCard({
  entry,
  index,
  podiumCount,
  leaderXp,
}: {
  entry: RankedXpLearner;
  index: number;
  podiumCount: number;
  leaderXp: number;
}) {
  const visual = getPodiumVisual(entry.rank);
  const MedalIcon = visual.icon;
  const level = getLevel(entry.xp);
  const href = entry.isCurrentUser ? "/hv/profile" : `/u/${entry.userId}`;
  const ratio = leaderXp > 0 ? Math.min(1, entry.xp / leaderXp) : 0;

  return (
    <Link
      href={href}
      aria-current={entry.isCurrentUser ? "true" : undefined}
      className={cn(
        "group relative flex flex-col items-center rounded-3xl border p-4 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
        visual.card,
        entry.isCurrentUser && "ring-2 ring-primary/35",
        getDesktopPodiumOrderClass(index, podiumCount),
      )}
    >
      <div className="flex w-full items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums",
            visual.badge,
          )}
        >
          <MedalIcon className={cn("size-3.5", visual.iconColor)} aria-hidden />
          #{entry.rank}
        </span>
        {entry.isCurrentUser && (
          <span className="rounded-full bg-background/95 px-2.5 py-0.5 text-[11px] font-semibold text-primary shadow-xs">
            Bạn
          </span>
        )}
      </div>

      <AvatarBadge
        name={entry.name}
        tone={visual.avatarTone}
        size={visual.avatarSize}
        className="mt-3"
      />

      <p className="mt-3 max-w-full truncate text-sm font-bold text-foreground sm:text-base">
        {entry.name}
      </p>
      <p className="mt-0.5 max-w-full truncate text-xs text-muted-foreground">
        Level {level.level} · {level.title}
      </p>

      <p
        className={cn(
          "mt-3 text-xl font-bold tracking-tight tabular-nums",
          visual.xpColor,
        )}
      >
        {numberFormat.format(entry.xp)}
        <span className="ml-1 text-xs font-semibold text-muted-foreground">
          XP
        </span>
      </p>

      <div className="mt-3 w-full">
        <Progress
          value={ratio}
          label={`XP của ${entry.name} so với người dẫn đầu`}
          className="h-1.5 bg-background/80"
          barClassName={visual.bar}
        />
      </div>
    </Link>
  );
}

function LeaderboardRow({
  entry,
  leaderXp,
}: {
  entry: RankedXpLearner;
  leaderXp: number;
}) {
  const level = getLevel(entry.xp);
  const href = entry.isCurrentUser ? "/hv/profile" : `/u/${entry.userId}`;
  const ratio = leaderXp > 0 ? Math.min(1, entry.xp / leaderXp) : 0;

  return (
    <li>
      <Link
        href={href}
        aria-current={entry.isCurrentUser ? "true" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 sm:px-4",
          entry.isCurrentUser
            ? "bg-secondary/35 ring-1 ring-primary/20 hover:bg-secondary/50"
            : "hover:bg-muted/60",
        )}
      >
        <span
          className={cn(
            "w-8 shrink-0 text-center text-xs font-bold tabular-nums",
            entry.isCurrentUser ? "text-primary" : "text-muted-foreground",
          )}
        >
          #{entry.rank}
        </span>

        <AvatarBadge
          name={entry.name}
          tone={entry.isCurrentUser ? "sky" : "muted"}
          size="sm"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-foreground">
              {entry.name}
            </p>
            {entry.isCurrentUser && (
              <span className="shrink-0 rounded-full bg-secondary/80 px-2 py-0.5 text-[10px] font-semibold text-primary">
                Bạn
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            Level {level.level} · {level.title}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="text-sm font-bold text-foreground tabular-nums sm:text-base">
            {numberFormat.format(entry.xp)}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              XP
            </span>
          </span>
          {leaderXp > 0 && (
            <Progress
              value={ratio}
              label={`XP của ${entry.name} so với người dẫn đầu`}
              className="h-1 w-16 bg-muted sm:w-24"
              barClassName={entry.isCurrentUser ? "bg-primary" : "bg-highlight"}
            />
          )}
        </div>
      </Link>
    </li>
  );
}

export function LeaderboardView({ data }: { data: XpLeaderboardView }) {
  const { period, selectedPath, paths, weekRange, entries, myStanding } = data;
  const leaderXp = entries[0]?.xp ?? 0;
  const topEntries = entries.slice(0, 3);
  const remainingEntries = entries.slice(topEntries.length);

  const podiumGridClass =
    topEntries.length === 1
      ? "grid grid-cols-1 sm:mx-auto sm:w-full sm:max-w-sm"
      : topEntries.length === 2
        ? "grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-end"
        : "grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end";

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Hero section */}
      <section
        aria-labelledby="leaderboard-page-title"
        className="rounded-[1.75rem] border border-border/60 bg-background p-4 sm:p-6"
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/60 px-3 py-1 text-xs font-semibold text-primary">
                <Trophy className="size-3.5 text-accent" aria-hidden />
                Bảng xếp hạng học viên
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/70 px-3 py-1 text-xs font-medium text-muted-foreground">
                {period === "week" && weekRange ? (
                  <>
                    <Calendar className="size-3.5" aria-hidden />
                    {formatWeekLabel(weekRange.startsAt, weekRange.endsAt)} ·
                    giờ VN
                  </>
                ) : (
                  "Tất cả thời gian"
                )}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <span
                aria-hidden
                className="hidden size-11 shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent-strong sm:grid"
              >
                <Trophy className="size-5" />
              </span>
              <h1
                id="leaderboard-page-title"
                className="min-w-0 truncate text-2xl font-bold tracking-tight text-foreground sm:text-3xl"
              >
                {selectedPath ? selectedPath.title : "Xếp hạng XP"}
              </h1>
            </div>

            <p className="mt-1.5 text-sm text-muted-foreground">
              {period === "week"
                ? "Thi đua XP kiếm được trong tuần này cùng cộng đồng học viên."
                : selectedPath
                  ? `Những học viên dẫn đầu điểm XP tích lũy trong lộ trình ${selectedPath.title}.`
                  : "Vinh danh các học viên tích lũy điểm XP cao nhất trên toàn hệ thống."}
            </p>

            <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1 tabular-nums">
                <Users className="size-3.5 text-primary" aria-hidden />
                {numberFormat.format(data.totalRankedLearners)} học viên có XP
              </span>
              {entries[0] && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-accent-strong tabular-nums">
                  <Crown className="size-3.5 text-accent" aria-hidden />
                  Dẫn đầu: {numberFormat.format(entries[0].xp)} XP
                </span>
              )}
            </div>
          </div>

          <MyStandingCard
            standing={myStanding}
            totalRankedLearners={data.totalRankedLearners}
            leaderXp={leaderXp}
          />
        </div>
      </section>

      {/* Filters bar */}
      <section
        aria-label="Bộ lọc bảng xếp hạng"
        className="rounded-[1.75rem] border border-border/60 bg-background p-4 sm:px-5 sm:py-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <nav
            aria-label="Khoảng thời gian"
            className="inline-flex w-full rounded-2xl bg-secondary/30 p-1 sm:w-auto"
          >
            {(
              [
                { value: "all", label: "Tất cả" },
                { value: "week", label: "Tuần này" },
              ] as const
            ).map((option) => {
              const active = period === option.value;
              return (
                <Link
                  key={option.value}
                  href={buildLeaderboardHref(option.value, selectedPath?.slug)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 sm:flex-initial",
                    active
                      ? "bg-background text-primary shadow-xs"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option.value === "week" && (
                    <Calendar className="size-3.5" aria-hidden />
                  )}
                  {option.label}
                </Link>
              );
            })}
          </nav>

          <p className="text-xs font-medium text-muted-foreground">
            Phạm vi:{" "}
            <span className="font-semibold text-foreground">
              {selectedPath ? selectedPath.title : "Toàn hệ thống"}
            </span>
          </p>
        </div>

        <div className="mt-3 flex flex-col gap-2 border-t border-border/50 pt-3 sm:flex-row sm:items-center">
          <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <BookOpen className="size-3.5" aria-hidden />
            Lộ trình
          </span>
          <nav
            aria-label="Lọc theo lộ trình"
            className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0"
          >
            <Link
              href={buildLeaderboardHref(period, null)}
              aria-current={selectedPath === null ? "page" : undefined}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
                selectedPath === null
                  ? "border-primary/20 bg-secondary/70 text-primary"
                  : "border-border/70 bg-background text-foreground/80 hover:bg-muted/60",
              )}
            >
              Tổng hệ thống
            </Link>
            {paths.map((path) => {
              const active = selectedPath?.id === path.id;
              return (
                <Link
                  key={path.id}
                  href={buildLeaderboardHref(period, path.slug)}
                  aria-current={active ? "page" : undefined}
                  title={path.title}
                  className={cn(
                    "max-w-[14rem] shrink-0 truncate rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 sm:max-w-[18rem]",
                    active
                      ? "border-primary/20 bg-secondary/70 text-primary"
                      : "border-border/70 bg-background text-foreground/80 hover:bg-muted/60",
                  )}
                >
                  {path.title}
                </Link>
              );
            })}
          </nav>
        </div>
      </section>

      {entries.length === 0 ? (
        <section
          aria-labelledby="leaderboard-empty-heading"
          className="rounded-[1.75rem] border border-border/60 bg-background p-4 sm:p-6"
        >
          <div className="rounded-3xl bg-secondary/20 px-4 py-12 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-background text-accent shadow-xs">
              <Trophy className="size-6" aria-hidden />
            </span>
            <h2
              id="leaderboard-empty-heading"
              className="mt-3 text-base font-bold text-foreground"
            >
              Chưa có dữ liệu xếp hạng
            </h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              {selectedPath
                ? "Chưa có học viên nào ghi nhận XP cho lộ trình này trong khoảng thời gian đã chọn."
                : "Chưa có hoạt động ghi nhận XP trong khoảng thời gian đã chọn."}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {selectedPath && (
                <Button asChild variant="outline" size="sm">
                  <Link href={buildLeaderboardHref(period, null)}>
                    Xem toàn hệ thống
                  </Link>
                </Button>
              )}
              <Button asChild size="sm">
                <Link href="/hv/paths">Khám phá lộ trình</Link>
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <>
          {/* Top 3 podium */}
          <section
            aria-labelledby="podium-heading"
            className="rounded-[1.75rem] border border-border/60 bg-background p-4 sm:p-6"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2
                id="podium-heading"
                className="inline-flex items-center gap-2 text-sm font-bold text-foreground"
              >
                <span className="grid size-7 place-items-center rounded-lg bg-accent/15 text-accent-strong">
                  <Award className="size-4" aria-hidden />
                </span>
                Vinh danh Top {topEntries.length}
              </h2>
              <span className="text-xs text-muted-foreground">
                Đồng XP xếp đồng hạng
              </span>
            </div>

            <div className={podiumGridClass}>
              {topEntries.map((entry, index) => (
                <PodiumCard
                  key={entry.userId}
                  entry={entry}
                  index={index}
                  podiumCount={topEntries.length}
                  leaderXp={leaderXp}
                />
              ))}
            </div>
          </section>

          {/* Compact ranking list (#4+) */}
          {remainingEntries.length > 0 && (
            <section
              aria-labelledby="leaderboard-list-heading"
              className="rounded-[1.75rem] border border-border/60 bg-background p-4 sm:p-5"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2
                  id="leaderboard-list-heading"
                  className="text-sm font-bold text-foreground"
                >
                  Các thứ hạng tiếp theo
                </h2>
                <span className="text-xs font-medium text-muted-foreground tabular-nums">
                  Top {entries.length} ·{" "}
                  {numberFormat.format(data.totalRankedLearners)} học viên
                </span>
              </div>

              <ol className="space-y-1.5">
                {remainingEntries.map((entry) => (
                  <LeaderboardRow
                    key={entry.userId}
                    entry={entry}
                    leaderXp={leaderXp}
                  />
                ))}
              </ol>

              {!myStanding.inTop && myStanding.rank !== null && (
                <div className="mt-4 rounded-2xl bg-secondary/25 px-4 py-3 text-xs text-foreground">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      Bạn đang ở hạng{" "}
                      <strong className="text-primary tabular-nums">
                        #{myStanding.rank}
                      </strong>{" "}
                      với{" "}
                      <strong className="tabular-nums">
                        {numberFormat.format(myStanding.xp)} XP
                      </strong>{" "}
                      (ngoài Top {entries.length}).
                    </span>
                    <Link
                      href="/hv/paths"
                      className="font-semibold text-primary hover:underline"
                    >
                      Học thêm để thăng hạng →
                    </Link>
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
