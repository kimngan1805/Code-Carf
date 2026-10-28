import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  Braces,
  CalendarCheck2,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  CodeXml,
  Database,
  ExternalLink,
  FileCode2,
  Flame,
  Globe,
  GraduationCap,
  History,
  Mail,
  Medal,
  Settings,
  Shield,
  Sparkles,
  Star,
  Trophy,
  XCircle,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  formatProfileDate,
  formatSubmissionDateTime,
  getSubmissionLanguageLabel,
  SUBMISSION_STATUS_META,
} from "../service";
import type {
  ProfileBadgeItem,
  ProfilePathProgress,
  ProfileSubmissionItem,
  PublicStudentProfile,
} from "../types";

const numberFormat = new Intl.NumberFormat("vi-VN");

const slugIconMap: Record<string, LucideIcon> = {
  "first-step": Star,
  "streak-7": Flame,
  "first-path-room": Medal,
  "fast-solver": Trophy,
  "night-owl": Shield,
};

const fallbackBadgeIcons: LucideIcon[] = [
  Award,
  Medal,
  Shield,
  Star,
  Flame,
  Trophy,
];

const pathIcons: LucideIcon[] = [BookOpen, Database, Globe, Braces, CodeXml];

/** Pastel tones matching Student Dashboard and Achievements. */
const tones = [
  {
    soft: "bg-accent/10",
    tile: "bg-accent/15 text-accent-strong",
    bar: "bg-accent-strong",
    line: "text-accent",
  },
  {
    soft: "bg-secondary/40",
    tile: "bg-secondary/70 text-primary",
    bar: "bg-primary",
    line: "text-primary",
  },
  {
    soft: "bg-highlight/10",
    tile: "bg-highlight/20 text-primary",
    bar: "bg-highlight",
    line: "text-highlight",
  },
];

const statusStyles = {
  success: {
    pill: "bg-success/15 text-success",
    tile: "bg-success/15 text-success",
    icon: CheckCircle2,
  },
  destructive: {
    pill: "bg-destructive/15 text-destructive",
    tile: "bg-destructive/15 text-destructive",
    icon: XCircle,
  },
  warning: {
    pill: "bg-warning/15 text-warning",
    tile: "bg-warning/15 text-warning",
    icon: Clock3,
  },
  secondary: {
    pill: "bg-secondary/60 text-primary",
    tile: "bg-secondary/60 text-primary",
    icon: Clock3,
  },
} as const;

function initials(name: string) {
  return (name.trim().split(/\s+/).at(-1)?.[0] ?? "?").toUpperCase();
}

function Panel({
  className,
  children,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "min-w-0 rounded-[1.75rem] border border-border/60 bg-background p-4 sm:p-5",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}

function BadgeIcon({
  slug,
  index = 0,
  className,
}: {
  slug: string;
  index?: number;
  className?: string;
}) {
  const Icon =
    slugIconMap[slug] ?? fallbackBadgeIcons[index % fallbackBadgeIcons.length];
  return <Icon className={className} aria-hidden />;
}

function Sparkline({ seed, className }: { seed: number; className: string }) {
  const a = 10 + (seed % 3) * 4;
  const b = 26 - (seed % 2) * 6;
  return (
    <svg
      viewBox="0 0 120 36"
      aria-hidden
      className={cn("h-8 w-20 shrink-0 sm:h-9 sm:w-24", className)}
      fill="none"
    >
      <path
        d={`M2 ${b} C 20 ${b}, 24 ${a}, 42 ${a + 4} S 66 30, 80 ${a + 8} S 104 ${a - 4}, 118 ${a}`}
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ProfileHeaderCard({
  profile,
  email,
  mode,
  isOwnPublicView = false,
}: {
  profile: PublicStudentProfile;
  /** Provided only on `/hv/profile` for the authenticated owner. */
  email?: string;
  mode: "own" | "public";
  isOwnPublicView?: boolean;
}) {
  const isOwn = mode === "own";

  return (
    <section
      aria-label={
        isOwn ? "Thông tin hồ sơ cá nhân" : "Thông tin hồ sơ công khai"
      }
      className={cn(
        "relative overflow-hidden rounded-[1.75rem] border border-border/60 p-5 sm:p-6",
        isOwn
          ? "bg-gradient-to-br from-secondary/50 via-background to-accent/15"
          : "bg-gradient-to-br from-highlight/15 via-background to-secondary/45",
      )}
    >
      {/* Subtle decorative shapes matching Code Carf illustration style */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 -right-10 size-44 rounded-full bg-secondary/40"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-10 -bottom-8 hidden size-28 rounded-full bg-accent/10 sm:block"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute top-5 right-6 hidden size-10 rotate-12 place-items-center rounded-2xl bg-background/80 text-accent shadow-sm md:grid"
      >
        {isOwn ? <CodeXml className="size-5" /> : <Trophy className="size-5" />}
      </span>

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative w-fit shrink-0">
            <div className="grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-primary to-highlight p-1 shadow-lg shadow-primary/20 sm:size-24">
              <div className="grid size-full place-items-center rounded-[1.25rem] bg-primary text-2xl font-bold text-primary-foreground sm:text-3xl">
                {initials(profile.name)}
              </div>
            </div>
            <span className="absolute -right-2 -bottom-2 inline-flex items-center gap-1 rounded-full border-2 border-background bg-accent-strong px-2.5 py-0.5 text-[11px] font-bold text-accent-foreground shadow-sm tabular-nums">
              Lv.{profile.level.level}
            </span>
          </div>

          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/20">
                <GraduationCap className="size-3.5" aria-hidden />
                {profile.level.title}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
                  isOwn
                    ? "border-primary/25 bg-background/90 text-primary"
                    : "border-border/80 bg-background/90 text-muted-foreground",
                )}
              >
                {isOwn ? (
                  <>
                    <Sparkles className="size-3.5 text-accent" aria-hidden />
                    Hồ sơ cá nhân
                  </>
                ) : (
                  <>
                    <Globe className="size-3.5 text-primary" aria-hidden />
                    Hồ sơ công khai
                  </>
                )}
              </span>
            </div>

            <h1 className="text-2xl font-semibold tracking-tight break-words sm:text-3xl">
              {profile.name}
            </h1>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:text-sm">
              {email && (
                <span className="inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border border-border/60 bg-background/85 px-3 py-1">
                  <Mail
                    className="size-3.5 shrink-0 text-primary"
                    aria-hidden
                  />
                  <span className="break-all text-foreground">{email}</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/85 px-3 py-1">
                <CalendarDays
                  className="size-3.5 shrink-0 text-primary"
                  aria-hidden
                />
                <span>
                  Tham gia{" "}
                  <time
                    dateTime={profile.joinedAt.toISOString()}
                    className="font-semibold text-foreground tabular-nums"
                  >
                    {formatProfileDate(profile.joinedAt)}
                  </time>
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
          {isOwn ? (
            <>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="w-full rounded-full bg-background/90 px-4 sm:w-auto"
              >
                <Link href={`/u/${profile.id}`}>
                  <ExternalLink className="size-4" aria-hidden />
                  Xem hồ sơ công khai
                </Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="w-full rounded-full px-4 shadow-sm shadow-primary/20 sm:w-auto"
              >
                <Link href="/settings">
                  <Settings className="size-4" aria-hidden />
                  Cài đặt tài khoản
                </Link>
              </Button>
            </>
          ) : (
            isOwnPublicView && (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="w-full rounded-full bg-background/90 px-4 sm:w-auto"
              >
                <Link href="/hv/profile">
                  Quay lại hồ sơ cá nhân
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
            )
          )}
        </div>
      </div>
    </section>
  );
}

export function ProfileOverviewStats({
  profile,
}: {
  profile: PublicStudentProfile;
}) {
  const { level, streak, stats } = profile;
  const levelPercent = Math.round(
    Math.min(1, Math.max(0, level.progress)) * 100,
  );

  const cards = [
    {
      label: "Tổng XP",
      value: numberFormat.format(level.xp),
      helper: "điểm tích lũy",
      icon: Zap,
      surface: "bg-highlight/10",
      tile: "bg-highlight/20 text-primary",
    },
    {
      label: "Chuỗi ngày học",
      value: `${streak.current}`,
      helper: `kỷ lục ${streak.longest} ngày`,
      icon: Flame,
      surface: "bg-accent/10",
      tile: "bg-accent/15 text-accent-strong",
    },
    {
      label: "Lộ trình",
      value: `${stats.enrolledPaths}`,
      helper: `${stats.completedPaths} đã hoàn thành`,
      icon: BookOpen,
      surface: "bg-secondary/40",
      tile: "bg-secondary/70 text-primary",
    },
    {
      label: "Huy hiệu",
      value: `${stats.badgesCount}`,
      helper: `${stats.roomsDone} bài đã xong`,
      icon: Award,
      surface: "bg-success/10",
      tile: "bg-success/15 text-success",
    },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <Panel
        aria-labelledby="profile-overview-heading"
        className="lg:col-span-7"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-secondary/60 text-primary">
              <Sparkles className="size-4" aria-hidden />
            </span>
            <div>
              <h2
                id="profile-overview-heading"
                className="text-sm font-semibold"
              >
                Tổng quan học tập
              </h2>
              <p className="text-xs text-muted-foreground">
                Thành quả tích lũy qua bài học và cuộc thi
              </p>
            </div>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground tabular-nums">
            {stats.roomsDone} bài học đã xong
          </span>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3">
          {cards.map((card) => (
            <div
              key={card.label}
              className={cn(
                "flex min-w-0 flex-col rounded-3xl p-4 transition-transform hover:-translate-y-0.5",
                card.surface,
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  aria-hidden
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-xl",
                    card.tile,
                  )}
                >
                  <card.icon className="size-4" />
                </span>
                <dt className="truncate text-xs font-semibold text-muted-foreground">
                  {card.label}
                </dt>
              </div>
              <dd className="mt-3 text-2xl leading-tight font-semibold tracking-tight tabular-nums sm:text-3xl">
                {card.value}
              </dd>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {card.helper}
              </p>
            </div>
          ))}
        </dl>
      </Panel>

      <section
        aria-labelledby="profile-level-heading"
        className="relative flex min-w-0 flex-col justify-between overflow-hidden rounded-[1.75rem] border border-border/60 bg-gradient-to-b from-secondary/45 via-background to-accent/10 p-4 sm:p-5 lg:col-span-5"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-background/90 text-primary shadow-sm">
              <GraduationCap className="size-4" aria-hidden />
            </span>
            <h2 id="profile-level-heading" className="text-sm font-semibold">
              Cấp độ & Tiến trình
            </h2>
          </div>
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground tabular-nums">
            {levelPercent}%
          </span>
        </div>

        <div className="my-4 flex items-center gap-4 rounded-2xl border border-border/60 bg-background/90 p-3.5">
          <div
            aria-hidden
            className="grid size-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-secondary to-highlight/40 p-1.5"
          >
            <div className="grid size-full place-items-center rounded-full bg-background text-accent shadow-sm">
              <Trophy className="size-6" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-primary">
              Level {level.level}
            </p>
            <p className="truncate text-lg font-semibold">{level.title}</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {numberFormat.format(level.xp)} XP hiện có
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-muted/70 p-3.5">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold">
            <span>Mục tiêu tiếp theo</span>
            <span className="text-primary tabular-nums">
              {level.nextXp !== null
                ? `${numberFormat.format(level.xp)} / ${numberFormat.format(level.nextXp)} XP`
                : "Cấp độ tối đa"}
            </span>
          </div>
          <Progress
            value={level.progress}
            label="Tiến độ lên cấp"
            className="mt-2 bg-background"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {level.nextXp === null
              ? "Đã chinh phục cấp độ cao nhất hiện tại!"
              : `Còn ${numberFormat.format(level.nextXp - level.xp)} XP nữa để lên Level ${level.level + 1}.`}
          </p>
        </div>
      </section>
    </div>
  );
}

export function ProfilePathsSection({
  paths,
  isOwner,
}: {
  paths: ProfilePathProgress[];
  isOwner: boolean;
}) {
  return (
    <Panel aria-labelledby="profile-paths-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-secondary/60 text-primary">
            <BookOpen className="size-4" aria-hidden />
          </span>
          <div>
            <h2 id="profile-paths-heading" className="text-sm font-semibold">
              {isOwner ? "Lộ trình đang học" : "Lộ trình đang theo học"}
            </h2>
            <p className="text-xs text-muted-foreground">
              Tiến độ hoàn thành các bài học theo từng lộ trình
            </p>
          </div>
        </div>
        <span className="rounded-full bg-secondary/50 px-3 py-1 text-xs font-semibold text-primary tabular-nums">
          {paths.length} lộ trình
        </span>
      </div>

      {paths.length === 0 ? (
        <div className="mt-4 flex flex-col gap-4 rounded-3xl bg-secondary/25 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-background text-primary shadow-sm">
              <BookOpen className="size-6" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {isOwner
                  ? "Bắt đầu lộ trình đầu tiên của bạn"
                  : "Học viên chưa tham gia lộ trình nào"}
              </p>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                {isOwner
                  ? "Chọn một lộ trình phù hợp để học từng bước, tích lũy XP và mở khóa huy hiệu."
                  : "Các lộ trình đã đăng ký và tiến độ học tập sẽ hiển thị tại đây."}
              </p>
            </div>
          </div>
          {isOwner && (
            <Button
              asChild
              size="sm"
              className="shrink-0 self-start rounded-full px-5 sm:self-auto"
            >
              <Link href="/hv/paths">
                Khám phá lộ trình
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <ul className="mt-4 grid gap-3.5 sm:grid-cols-2">
          {paths.map((path, index) => {
            const tone = tones[index % tones.length];
            const Icon = pathIcons[index % pathIcons.length];
            const isCompleted = path.total > 0 && path.completed === path.total;

            return (
              <li key={path.id} className="min-w-0">
                <Link
                  href={`/hv/paths/${path.slug}`}
                  className={cn(
                    "group flex h-full flex-col justify-between rounded-3xl p-4 transition-transform hover:-translate-y-0.5",
                    tone.soft,
                  )}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className={cn(
                            "grid size-9 shrink-0 place-items-center rounded-xl",
                            tone.tile,
                          )}
                        >
                          <Icon className="size-4" aria-hidden />
                        </span>
                        <h3 className="min-w-0 text-sm font-semibold break-words">
                          {path.title}
                        </h3>
                      </div>
                      <span className="shrink-0 rounded-full bg-background/85 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
                        {path.completed}/{path.total}
                      </span>
                    </div>

                    <div className="mt-4 flex items-end justify-between gap-2">
                      <p className="text-3xl leading-none font-semibold tracking-tight tabular-nums sm:text-4xl">
                        {path.percent}
                        <span className="text-base font-medium text-muted-foreground">
                          %
                        </span>
                      </p>
                      <Sparkline seed={index} className={tone.line} />
                    </div>

                    <Progress
                      value={path.total === 0 ? 0 : path.completed / path.total}
                      label={`Tiến độ ${path.title}`}
                      className="mt-3 bg-background/80"
                      barClassName={tone.bar}
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                    <p className="min-w-0 truncate text-muted-foreground">
                      {isCompleted ? (
                        <span className="font-semibold text-success">
                          Đã hoàn thành lộ trình
                        </span>
                      ) : path.nextRoom ? (
                        <>
                          <span className="font-semibold text-foreground">
                            Tiếp theo:
                          </span>{" "}
                          {path.nextRoom}
                        </>
                      ) : (
                        "Chưa có bài học"
                      )}
                    </p>
                    <ArrowRight
                      className="size-3.5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

export function ProfileBadgesSection({
  badges,
  isOwner,
}: {
  badges: ProfileBadgeItem[];
  isOwner: boolean;
}) {
  return (
    <Panel aria-labelledby="profile-badges-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-accent/15 text-accent-strong">
            <Award className="size-4" aria-hidden />
          </span>
          <div>
            <h2 id="profile-badges-heading" className="text-sm font-semibold">
              Huy hiệu đã nhận
            </h2>
            <p className="text-xs text-muted-foreground">
              Các cột mốc đã mở khóa trong quá trình học tập
            </p>
          </div>
        </div>
        {isOwner ? (
          <Link
            href="/hv/achievements"
            className="inline-flex items-center gap-1 rounded-full bg-secondary/50 px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-secondary"
          >
            Xem tất cả ({badges.length})
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        ) : (
          <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent-strong tabular-nums">
            {badges.length} huy hiệu
          </span>
        )}
      </div>

      {badges.length === 0 ? (
        <div className="mt-4 flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-secondary/30 to-accent/10 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-background text-accent-strong shadow-sm">
              <Sparkles className="size-6" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {isOwner
                  ? "Bộ sưu tập huy hiệu đang chờ bạn"
                  : "Chưa có huy hiệu nào được mở khóa"}
              </p>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                {isOwner
                  ? "Hoàn thành bài tập đầu tiên hoặc giữ chuỗi ngày học để mở khóa huy hiệu mới."
                  : "Huy hiệu sẽ hiển thị khi học viên đạt các cột mốc học tập."}
              </p>
            </div>
          </div>
          {isOwner && (
            <Button
              asChild
              size="sm"
              className="shrink-0 self-start rounded-full px-5 sm:self-auto"
            >
              <Link href="/hv/achievements">
                Khám phá thành tích
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <ul className="mt-4 grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {badges.map((badge, index) => {
            const tone = tones[index % tones.length];
            return (
              <li key={badge.id} className="min-w-0">
                <article className="flex h-full flex-col justify-between rounded-3xl border border-border/60 bg-background p-4 transition-shadow hover:shadow-lg hover:shadow-primary/10">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={cn(
                          "grid size-12 shrink-0 place-items-center rounded-2xl",
                          tone.tile,
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

                    <h3 className="mt-3.5 text-base font-semibold break-words">
                      {badge.name}
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground break-words">
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
                        {formatProfileDate(badge.awardedAt)}
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

/** Private-only section: rendered strictly on `/hv/profile`, never on `/u/[id]`. */
export function ProfileSubmissionsSection({
  submissions,
}: {
  submissions: ProfileSubmissionItem[];
}) {
  const acceptedCount = submissions.filter(
    (item) => item.status === "ACCEPTED",
  ).length;

  return (
    <Panel aria-labelledby="profile-submissions-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-secondary/60 text-primary">
            <History className="size-4" aria-hidden />
          </span>
          <div>
            <h2
              id="profile-submissions-heading"
              className="text-sm font-semibold"
            >
              Lịch sử làm bài gần đây
            </h2>
            <p className="text-xs text-muted-foreground">
              Chỉ hiển thị với riêng bạn trong hồ sơ cá nhân
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {acceptedCount > 0 && (
            <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success tabular-nums">
              {acceptedCount} đạt
            </span>
          )}
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground tabular-nums">
            {submissions.length} lượt nộp
          </span>
        </div>
      </div>

      {submissions.length === 0 ? (
        <div className="mt-4 flex flex-col gap-4 rounded-3xl bg-secondary/25 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-background text-primary shadow-sm">
              <FileCode2 className="size-6" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                Sẵn sàng cho bài nộp đầu tiên
              </p>
              <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                Khi bạn nộp bài trong lộ trình học hoặc cuộc thi, trạng thái và
                điểm số sẽ được lưu lại tại đây.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-full bg-background px-4"
            >
              <Link href="/contests">Xem cuộc thi</Link>
            </Button>
            <Button asChild size="sm" className="rounded-full px-4">
              <Link href="/hv/paths">
                Học lộ trình
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {submissions.map((item) => {
            const statusMeta = SUBMISSION_STATUS_META[item.status];
            const style = statusStyles[statusMeta.tone];
            const StatusIcon = style.icon;

            return (
              <li key={item.id}>
                <article className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background p-4 transition-colors hover:bg-muted/35 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      aria-hidden
                      className={cn(
                        "mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl",
                        style.tile,
                      )}
                    >
                      <StatusIcon className="size-4" />
                    </span>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={cn(
                            "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                            style.pill,
                          )}
                        >
                          {statusMeta.label}
                        </span>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                          <CodeXml className="size-3" aria-hidden />
                          {getSubmissionLanguageLabel(item.language)}
                        </span>
                      </div>

                      <h3 className="text-sm font-semibold break-words">
                        {item.exerciseTitle}
                      </h3>

                      {item.contextHref ? (
                        <Link
                          href={item.contextHref}
                          className="inline-block max-w-full truncate text-xs font-medium text-primary hover:underline"
                        >
                          {item.contextLabel}
                        </Link>
                      ) : (
                        <p className="truncate text-xs text-muted-foreground">
                          {item.contextLabel}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2.5 text-xs sm:shrink-0 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
                    <span className="rounded-xl bg-muted/80 px-2.5 py-1 font-semibold text-foreground tabular-nums">
                      {item.score !== null
                        ? `${item.score}/${item.maxPoints} điểm`
                        : "Chưa có điểm"}
                      {item.runtimeMs !== null && (
                        <span className="ml-1.5 font-normal text-muted-foreground">
                          · {item.runtimeMs} ms
                        </span>
                      )}
                    </span>
                    <time
                      dateTime={item.createdAt.toISOString()}
                      className="text-muted-foreground tabular-nums"
                    >
                      {formatSubmissionDateTime(item.createdAt)}
                    </time>
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
