import Link from "next/link";
import {
  ArrowRight,
  Award,
  BookOpen,
  Braces,
  CalendarClock,
  Check,
  ChevronRight,
  CodeXml,
  Database,
  Flame,
  Globe,
  GraduationCap,
  Lock,
  Medal,
  Plus,
  Shield,
  Sparkles,
  Star,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { APP_TIME_ZONE } from "@/features/progress/week-activity";
import { cn } from "@/lib/utils";
import type { Dashboard } from "../service";

const numberFormat = new Intl.NumberFormat("vi-VN");

/** Pastel tones cycled across cards; all built from brand tokens. */
const tones = [
  {
    soft: "bg-accent/10",
    tile: "bg-accent/15 text-accent-strong",
    chip: "border-accent/30 text-accent-strong",
    bar: "bg-accent",
    line: "text-accent",
  },
  {
    soft: "bg-secondary/40",
    tile: "bg-secondary/70 text-primary",
    chip: "border-primary/25 text-primary",
    bar: "bg-primary",
    line: "text-primary",
  },
  {
    soft: "bg-highlight/10",
    tile: "bg-highlight/20 text-primary",
    chip: "border-highlight/40 text-primary",
    bar: "bg-highlight",
    line: "text-highlight",
  },
];

const pathIcons: LucideIcon[] = [BookOpen, Database, Globe, Braces, CodeXml];

function Panel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-[1.75rem] border border-border/60 bg-background p-5",
        className,
      )}
    >
      {children}
    </section>
  );
}

function IconButton({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="grid size-9 place-items-center rounded-full bg-muted/80 text-foreground/70 transition-colors hover:bg-secondary/60 hover:text-primary"
    >
      <Icon className="size-4" aria-hidden />
    </Link>
  );
}

/* ---------- Title row ---------- */

export function DashboardTitle({ paths }: { paths: Dashboard["paths"] }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <h1 className="mr-auto text-3xl font-semibold tracking-tight sm:text-4xl">
        Trang chủ
      </h1>
      <ul className="flex flex-wrap gap-2">
        {paths.map((path, index) => {
          const tone = tones[index % tones.length];
          const Icon = pathIcons[index % pathIcons.length];
          return (
            <li key={path.id}>
              <Link
                href={`/paths/${path.slug}`}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-full border bg-background px-4 text-sm font-semibold transition-colors hover:bg-muted",
                  tone.chip,
                )}
              >
                <Icon className="size-4" aria-hidden />
                <span className="max-w-40 truncate">{path.title}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------- Learning progress ---------- */

function Sparkline({ seed, className }: { seed: number; className: string }) {
  // Decorative wave; the shape varies a little per path.
  const a = 10 + (seed % 3) * 4;
  const b = 26 - (seed % 2) * 6;
  return (
    <svg
      viewBox="0 0 120 36"
      aria-hidden
      className={cn("h-9 w-28", className)}
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

export function LearningProgress({
  paths,
  recommended,
}: {
  paths: Dashboard["paths"];
  recommended?: Dashboard["suggestedPaths"][number];
}) {
  return (
    <Panel>
      <div className="flex items-center gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-secondary/60 text-primary">
          <BookOpen className="size-4" aria-hidden />
        </span>
        <h2 className="mr-auto text-sm font-semibold">Tiến độ học tập</h2>
        <IconButton
          href="/paths"
          label="Xem tất cả lộ trình"
          icon={ChevronRight}
        />
      </div>

      {paths.length === 0 ? (
        <GettingStarted recommended={recommended} />
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {paths.slice(0, 4).map((path, index) => {
            const tone = tones[index % tones.length];
            const percent = path.total
              ? Math.round((path.completed / path.total) * 100)
              : 0;
            return (
              <li key={path.id}>
                <Link
                  href={`/paths/${path.slug}`}
                  className={cn(
                    "block h-full rounded-3xl p-4 transition-transform hover:-translate-y-0.5",
                    tone.soft,
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold">{path.title}</p>
                    <span className="shrink-0 rounded-full bg-background/80 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                      {path.completed}/{path.total}
                    </span>
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <p className="text-4xl font-semibold tracking-tight">
                      {percent}
                      <span className="text-lg text-muted-foreground">%</span>
                    </p>
                    <Sparkline seed={index} className={tone.line} />
                  </div>
                  <p className="mt-3 text-xs font-semibold">Bài tiếp theo</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {path.nextRoom ?? "Đã hoàn thành lộ trình 🎉"}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

/* ---------- Getting started (no enrolled paths yet) ---------- */

const startSteps = [
  {
    icon: BookOpen,
    title: "Chọn lộ trình",
    text: "Chọn chủ đề phù hợp trình độ",
  },
  {
    icon: CodeXml,
    title: "Làm bài đầu tiên",
    text: "Viết code và được chấm ngay",
  },
  {
    icon: Award,
    title: "Nhận XP, huy hiệu",
    text: "Lên cấp và giữ chuỗi ngày học",
  },
];

function GettingStarted({
  recommended,
}: {
  recommended?: Dashboard["suggestedPaths"][number];
}) {
  return (
    <div className="mt-4 rounded-3xl bg-secondary/30 p-5">
      <p className="font-semibold">Bắt đầu hành trình đầu tiên</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Chỉ cần 3 bước để có những điểm XP đầu tiên.
      </p>
      <ol className="mt-4 space-y-2">
        {startSteps.map((step, index) => (
          <li
            key={step.title}
            className="flex items-center gap-3 rounded-2xl bg-background px-3 py-2.5"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary/60 text-primary">
              <step.icon className="size-4" aria-hidden />
            </span>
            <p className="min-w-0 text-sm">
              <span className="font-semibold">
                {index + 1}. {step.title}
              </span>
              <span className="text-muted-foreground"> · {step.text}</span>
            </p>
          </li>
        ))}
      </ol>
      {recommended && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-primary/20 bg-background px-4 py-3">
          <Sparkles className="size-5 shrink-0 text-accent" aria-hidden />
          <p className="min-w-0 text-sm">
            <span className="text-muted-foreground">
              Gợi ý theo câu trả lời của bạn:{" "}
            </span>
            <span className="font-semibold">{recommended.title}</span>
          </p>
        </div>
      )}
      <Link
        href={recommended ? `/paths/${recommended.slug}` : "/paths"}
        className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
      >
        Khám phá ngay <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}

/* ---------- Suggested paths ---------- */

const suggestionIcons: LucideIcon[] = [CodeXml, Braces, Database];

export function SuggestedPaths({
  paths,
}: {
  paths: Dashboard["suggestedPaths"];
}) {
  if (paths.length === 0) return null;
  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Gợi ý cho bạn</h2>
        <Link
          href="/paths"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          Xem tất cả <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <ul className="mt-3 space-y-3">
        {paths.map((path, index) => {
          const tone = tones[(index + 1) % tones.length];
          const Icon = suggestionIcons[index % suggestionIcons.length];
          return (
            <li key={path.id}>
              <article className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-background p-4 transition-shadow hover:shadow-lg hover:shadow-primary/10 sm:flex-row sm:items-center">
                <span
                  className={cn(
                    "grid size-12 shrink-0 place-items-center rounded-2xl",
                    tone.tile,
                  )}
                >
                  <Icon className="size-6" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    {path.title}
                    {path.recommended && (
                      <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent-strong">
                        Phù hợp với bạn
                      </span>
                    )}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {path.description ||
                      "Lộ trình học lập trình theo từng bài."}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs whitespace-nowrap text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="size-3.5" aria-hidden />
                      {path.rooms} bài học
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3.5" aria-hidden />
                      {path.learners} đang học
                    </span>
                  </div>
                </div>
                <Link
                  href={`/paths/${path.slug}`}
                  className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-primary/20 px-4 text-sm font-semibold text-primary transition-colors hover:bg-secondary/50"
                >
                  Bắt đầu <ArrowRight className="size-4" aria-hidden />
                </Link>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ---------- Achievements: stats, earned and next badges ---------- */

const badgeIcons: LucideIcon[] = [Award, Medal, Shield, Star, Flame, Trophy];

export function AchievementStrip({
  badges,
  lockedBadges,
  stats,
}: {
  badges: Dashboard["badges"];
  lockedBadges: Dashboard["lockedBadges"];
  stats: Dashboard["stats"];
}) {
  const items = [
    { label: "Lộ trình xong", value: stats.paths, icon: BookOpen },
    { label: "Bài đã xong", value: stats.roomsDone, icon: Check },
    { label: "Huy hiệu", value: stats.badges, icon: Award },
  ];
  return (
    <Panel>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Thành tích</h2>
        <Link
          href="/achievements"
          className="text-xs font-semibold text-primary hover:underline"
        >
          Xem tất cả
        </Link>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2">
        {items.map((item, index) => {
          const tone = tones[index % tones.length];
          return (
            <div
              key={item.label}
              className={cn(
                "flex min-w-0 flex-col rounded-2xl px-3 py-3",
                tone.soft,
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "grid size-7 place-items-center rounded-lg",
                  tone.tile,
                )}
              >
                <item.icon className="size-4" />
              </span>
              <dt className="order-last mt-0.5 truncate text-xs text-muted-foreground">
                {item.label}
              </dt>
              <dd className="mt-2 text-2xl leading-tight font-semibold">
                {item.value}
              </dd>
            </div>
          );
        })}
      </dl>

      {badges.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-semibold text-muted-foreground">Đã nhận</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {badges.map((badge, index) => {
              const Icon = badgeIcons[index % badgeIcons.length];
              return (
                <li
                  key={badge.slug}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full py-1 pr-3 pl-1 text-xs font-semibold",
                    tones[index % tones.length].tile,
                  )}
                >
                  <span className="grid size-6 place-items-center rounded-full bg-background/70">
                    <Icon className="size-3.5" aria-hidden />
                  </span>
                  {badge.name}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {lockedBadges.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-semibold text-muted-foreground">
            Sắp mở khóa
          </p>
          <ul className="mt-2 divide-y divide-border/60">
            {lockedBadges.map((badge, index) => {
              const Icon = badgeIcons[index % badgeIcons.length];
              return (
                <li key={badge.slug} className="flex items-center gap-3 py-2.5">
                  <span
                    className={cn(
                      "relative grid size-10 shrink-0 place-items-center rounded-full",
                      tones[index % tones.length].tile,
                    )}
                  >
                    <Icon className="size-5 opacity-60" aria-hidden />
                    <span className="absolute -right-0.5 -bottom-0.5 grid size-4 place-items-center rounded-full bg-background text-muted-foreground ring-1 ring-border">
                      <Lock className="size-2.5" aria-hidden />
                    </span>
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{badge.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {badge.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Panel>
  );
}

/* ---------- Week / streak ---------- */

export function WeekPlan({ streak }: { streak: Dashboard["streak"] }) {
  return (
    <section>
      <h2 className="text-xl leading-snug font-semibold">
        Tuần học của bạn
        <span className="mt-1 block w-fit rounded-lg bg-secondary px-2 text-primary">
          Giữ lửa mỗi ngày
        </span>
      </h2>

      <div className="mt-4 rounded-[1.75rem] bg-secondary/30 p-4">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold">
            Tuần này
          </span>
          <span className="text-xs font-semibold text-primary">
            {streak.daysThisWeek}/7 ngày
          </span>
        </div>
        <ol className="mt-4 grid grid-cols-7 gap-1 text-center">
          {streak.week.map((day) => (
            <li
              key={day.dateKey}
              className="flex flex-col items-center gap-1.5"
            >
              <span
                className={cn(
                  "grid size-9 place-items-center rounded-full text-xs font-semibold",
                  day.status === "done" &&
                    "bg-primary text-primary-foreground shadow-md shadow-primary/30",
                  day.status === "today" &&
                    "bg-background text-primary ring-2 ring-highlight",
                  day.status === "missed" &&
                    "bg-background/70 text-muted-foreground",
                  day.status === "upcoming" &&
                    "border border-dashed border-primary/25 text-muted-foreground",
                )}
              >
                {day.status === "done" ? (
                  <Check className="size-4" aria-hidden />
                ) : (
                  day.dayOfMonth
                )}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {day.label}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-[1.75rem] bg-accent/10 p-4">
          <Flame className="size-7 text-accent" aria-hidden />
          <p className="mt-3 text-3xl font-semibold">{streak.current}</p>
          <p className="text-xs text-muted-foreground">ngày liên tiếp</p>
        </div>
        <div className="rounded-[1.75rem] bg-highlight/10 p-4">
          <Trophy className="size-7 text-primary" aria-hidden />
          <p className="mt-3 text-3xl font-semibold">{streak.longest}</p>
          <p className="text-xs text-muted-foreground">kỷ lục chuỗi</p>
        </div>
      </div>
    </section>
  );
}

/* ---------- Contest schedule ---------- */

const contestTime = new Intl.DateTimeFormat("vi-VN", {
  timeZone: APP_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function ContestSchedule({
  contests,
}: {
  contests: Dashboard["contests"];
}) {
  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Lịch thi</h2>
        <Link
          href="/contests"
          aria-label="Xem tất cả cuộc thi"
          className="grid size-9 place-items-center rounded-full bg-accent/15 text-accent-strong transition-colors hover:bg-accent/25"
        >
          <Plus className="size-4" aria-hidden />
        </Link>
      </div>
      {contests.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
          Chưa có cuộc thi sắp diễn ra.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {contests.map((contest, index) => (
            <li key={contest.id}>
              <Link
                href={`/contests/${contest.slug}`}
                className="flex items-center gap-3 rounded-2xl border border-border/60 px-3 py-2.5 transition-colors hover:bg-muted/60"
              >
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-lg",
                    tones[index % tones.length].tile,
                  )}
                >
                  <Trophy className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {contest.title}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  <CalendarClock className="size-3.5" aria-hidden />
                  {contest.startsAt
                    ? contestTime.format(contest.startsAt)
                    : "Sắp mở"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------- Journey hero ---------- */

export function JourneyCard({
  level,
  rank,
  streak,
}: {
  level: Dashboard["level"];
  rank: number;
  streak: Dashboard["streak"];
}) {
  return (
    <section className="relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-border/60 bg-gradient-to-b from-secondary/50 via-background to-accent/10 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Hành trình</h2>
        <IconButton href="/achievements" label="Xem thành tích" icon={Award} />
      </div>

      {/* Illustration built from icons and tokens */}
      <div
        aria-hidden
        className="relative mx-auto my-6 grid size-56 place-items-center"
      >
        <span className="absolute top-2 left-0 grid size-12 -rotate-12 place-items-center rounded-2xl bg-accent/15 text-accent-strong shadow-sm">
          <Braces className="size-6" />
        </span>
        <span className="absolute top-16 -left-2 grid size-12 rotate-6 place-items-center rounded-2xl bg-secondary/70 text-primary shadow-sm">
          <CodeXml className="size-6" />
        </span>
        <span className="absolute top-3 right-0 rounded-full bg-background px-3 py-1 text-xs font-bold text-primary shadow-sm">
          #{rank}
        </span>
        <Sparkles className="absolute right-6 bottom-8 size-6 text-accent" />
        <Sparkles className="absolute bottom-2 left-10 size-4 text-highlight" />
        <div className="grid size-40 place-items-center rounded-full bg-gradient-to-br from-secondary to-highlight/40 shadow-inner">
          <div className="grid size-28 place-items-center rounded-full bg-background shadow-xl shadow-primary/15">
            <Trophy className="size-14 text-accent" strokeWidth={1.5} />
          </div>
        </div>
        <span className="absolute -bottom-1 rounded-full bg-primary px-4 py-1.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30">
          Level {level.level}
        </span>
      </div>

      <div className="mt-auto">
        <div className="flex items-start justify-between gap-3">
          <p className="text-2xl font-semibold">
            {level.title}{" "}
            <GraduationCap className="inline size-6 text-primary" aria-hidden />
          </p>
          <span className="grid size-14 shrink-0 place-items-center rounded-full border-2 border-dashed border-primary/30 text-center text-sm leading-tight font-bold">
            #{rank}
            <span className="sr-only"> trên bảng xếp hạng</span>
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {level.nextXp === null
            ? "Bạn đã đạt cấp cao nhất. Tiếp tục giữ phong độ nhé!"
            : `Còn ${numberFormat.format(level.nextXp - level.xp)} XP nữa để lên cấp tiếp theo.`}
        </p>
        <Progress
          className="mt-3 bg-background"
          value={level.progress}
          label="Tiến độ lên cấp"
        />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-muted/70 p-3">
            <p className="text-xs text-muted-foreground">Tổng XP</p>
            <p className="mt-1 text-2xl font-semibold">
              {numberFormat.format(level.xp)}
            </p>
          </div>
          <div className="rounded-2xl bg-muted/70 p-3">
            <p className="text-xs text-muted-foreground">Chuỗi ngày</p>
            <p className="mt-1 text-2xl font-semibold">{streak.current}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Top learners ---------- */

export function TopLearners({
  learners,
  rank,
  me,
}: {
  learners: Dashboard["topLearners"];
  rank: number;
  me: Dashboard["me"];
}) {
  const medal = [
    "bg-accent text-accent-foreground",
    "bg-secondary text-primary",
    "bg-highlight/30 text-primary",
  ];
  const meInTop = learners.some((learner) => learner.isMe);
  return (
    <Panel>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Top học viên</h2>
        <Link
          href="/leaderboard"
          className="text-xs font-semibold text-primary hover:underline"
        >
          Tất cả
        </Link>
      </div>
      <ol className="mt-3 space-y-1">
        {learners.map((learner) => {
          const href = learner.isMe ? "/profile" : `/u/${learner.id}`;
          return (
            <li key={learner.id}>
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors hover:bg-muted/70 focus-visible:outline-2 focus-visible:outline-offset-2",
                  learner.isMe && "bg-secondary/40 hover:bg-secondary/60",
                )}
              >
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                    medal[learner.position - 1] ??
                      "bg-muted text-muted-foreground",
                  )}
                >
                  {learner.position}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {learner.name}
                  {learner.isMe && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      (bạn)
                    </span>
                  )}
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  {numberFormat.format(learner.xp)}
                  <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                    XP
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
        {!meInTop && (
          <li className="mt-2">
            <Link
              href="/profile"
              className="flex items-center gap-3 rounded-2xl border border-dashed border-primary/25 bg-secondary/20 px-2 py-2 transition-colors hover:bg-secondary/35 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-background text-xs font-bold text-primary">
                {rank}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {me.name}
                <span className="ml-1 text-xs text-muted-foreground">
                  (bạn)
                </span>
              </span>
              <span className="text-sm font-semibold tabular-nums">
                {numberFormat.format(me.xp)}
                <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                  XP
                </span>
              </span>
            </Link>
          </li>
        )}
      </ol>
    </Panel>
  );
}
