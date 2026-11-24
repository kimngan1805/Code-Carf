import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowDown,
  CalendarClock,
  Clock3,
  Flame,
  GraduationCap,
  Handshake,
  ListChecks,
  Swords,
  Trophy,
  User,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CONTEST_FORMATS,
  CONTEST_LEVELS,
  CONTEST_TYPES,
  formatDuration,
  questionCount,
  type ContestFormatKey,
  type ContestTypeKey,
  type ShowcaseContest,
} from "../catalog";
import { PublicPhase } from "./contest-card";

const FORMAT_ICONS: Record<ContestFormatKey, LucideIcon> = {
  solo: User,
  duel: Swords,
  team: UsersRound,
  ranked: Trophy,
  friendly: Handshake,
  tournament: ListChecks,
  daily: Flame,
  classroom: GraduationCap,
};

export const contestHref = (slug: string) =>
  `/thi-dau/${encodeURIComponent(slug)}`;

/** Ô minh họa nghiêng như thẻ lộ trình: emoji theo loại cuộc thi. */
export function ContestArt({
  type,
  size = "md",
}: {
  type: ContestTypeKey;
  size?: "md" | "lg";
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative grid rotate-[-8deg] place-items-center rounded-[28%] border-2 border-primary bg-background shadow-[4px_4px_0_0_var(--brand-blue)] transition-transform duration-300 group-hover:rotate-[4deg] group-hover:scale-105",
        size === "lg" ? "size-36 sm:size-40" : "size-20 sm:size-24",
      )}
    >
      <span
        className={cn(
          "drop-shadow-[0_6px_6px_rgb(0_0_0/0.25)]",
          size === "lg" ? "text-7xl sm:text-8xl" : "text-5xl sm:text-6xl",
        )}
      >
        {CONTEST_TYPES[type].art}
      </span>
    </span>
  );
}

export function FormatChip({ format }: { format: ContestFormatKey }) {
  const Icon = FORMAT_ICONS[format];
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-primary/20 bg-background px-2 py-0.5 text-xs font-semibold text-primary">
      <Icon aria-hidden className="size-3.5" />
      {CONTEST_FORMATS[format].label}
    </span>
  );
}

export function SampleBadge() {
  return (
    <span
      title="Cuộc thi mẫu để xem trước giao diện"
      className="rounded-full border border-dashed border-accent px-2 py-0.5 text-[11px] font-semibold text-accent-strong"
    >
      Mẫu
    </span>
  );
}

function CardMeta({ contest }: { contest: ShowcaseContest }) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        <Clock3 aria-hidden className="size-3.5" />
        {formatDuration(contest.durationMinutes)}
      </span>
      <span className="inline-flex items-center gap-1">
        <ListChecks aria-hidden className="size-3.5" />
        {questionCount(contest)}{" "}
        {contest.profile.type === "coding" ? "bài" : "câu"}
      </span>
      <span className="inline-flex items-center gap-1">
        <Users aria-hidden className="size-3.5" />
        {contest.participants} đăng ký
      </span>
    </p>
  );
}

const dateParts = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Ho_Chi_Minh",
});

/** "19/12, 15:19" theo giờ Việt Nam. */
function shortDate(value: string) {
  const part = Object.fromEntries(
    dateParts.formatToParts(new Date(value)).map((p) => [p.type, p.value]),
  );
  return `${part.day}/${part.month}, ${part.hour}:${part.minute}`;
}

function when(contest: ShowcaseContest) {
  const format = (value: string | null) => (value ? shortDate(value) : null);
  if (contest.phase === "live")
    return `Kết thúc ${format(contest.examEndsAt) ?? "chưa rõ"}`;
  if (contest.phase === "ended")
    return `Đã kết thúc ${format(contest.examEndsAt) ?? ""}`.trim();
  return format(contest.examStartsAt)
    ? `Bắt đầu ${format(contest.examStartsAt)}`
    : "Chờ công bố lịch";
}

/** Hero gọn: lời mời bên trái, cuộc thi nổi bật bên phải để thấy ngay khi mở trang. */
export function ShowcaseHero({ featured }: { featured?: ShowcaseContest }) {
  return (
    <section className="border-b bg-gradient-to-br from-secondary/40 via-background to-secondary/20">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <p className="inline-flex items-center rounded-full border border-primary/15 bg-background px-3 py-1.5 text-xs font-semibold text-primary">
            Đấu trí bằng từng dòng code
          </p>
          <h1 className="mt-5 text-4xl leading-[1.15] font-bold tracking-tight text-primary sm:text-5xl">
            Viết code. Vượt giới hạn.{" "}
            <span className="text-accent-strong">Chinh phục thử thách.</span>
          </h1>
          <p className="mt-5 max-w-md leading-7 text-muted-foreground">
            Tìm cuộc thi hợp với bạn: một mình, tay đôi, cả đội hay leo hạng. Tự
            do xem, đăng nhập khi sẵn sàng tham gia.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg" className="rounded-full">
              <a href="#kham-pha">
                Xem các cuộc thi
                <ArrowDown className="size-4" aria-hidden />
              </a>
            </Button>
            <Button asChild size="lg" variant="ghost" className="rounded-full">
              <a href="#cach-tham-gia">Thi đấu như thế nào?</a>
            </Button>
          </div>
        </div>
        {featured && <FeaturedCard contest={featured} />}
      </div>
    </section>
  );
}

function FeaturedCard({ contest }: { contest: ShowcaseContest }) {
  const type = CONTEST_TYPES[contest.profile.type];
  const reward = contest.profile.rewards[0];
  return (
    <article className="group relative overflow-hidden rounded-[2rem] border-2 border-primary bg-background p-6 shadow-[6px_6px_0_0_var(--brand-blue)] sm:p-7">
      <span
        aria-hidden
        className={cn(
          "absolute -top-10 -right-10 size-48 rounded-full",
          type.tone,
        )}
      />
      <div className="absolute top-6 right-6 hidden sm:block">
        <ContestArt type={contest.profile.type} />
      </div>
      <div className="relative sm:pr-32">
        <p className="text-xs font-bold tracking-[0.2em] text-accent-strong uppercase">
          Nổi bật
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <PublicPhase phase={contest.phase} />
          {contest.sample && <SampleBadge />}
        </div>
        <h2 className="mt-3 text-2xl leading-tight font-bold break-words">
          <Link
            href={contestHref(contest.slug)}
            className="rounded after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-ring"
          >
            {contest.title}
          </Link>
        </h2>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
          {contest.description}
        </p>
      </div>
      <div className="relative mt-4 flex flex-wrap items-center gap-2">
        {contest.profile.level && (
          <span className="rounded-md border border-success/40 bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
            {CONTEST_LEVELS[contest.profile.level]}
          </span>
        )}
        <FormatChip format={contest.profile.format} />
      </div>
      <div className="relative mt-4 flex flex-wrap items-end justify-between gap-3 border-t pt-4">
        <CardMeta contest={contest} />
        {reward && (
          <p className="text-sm">
            <span className="text-muted-foreground">Thưởng </span>
            <strong className="text-primary">{reward.title}</strong>
          </p>
        )}
      </div>
    </article>
  );
}

/** Thẻ gọn cho danh sách: chỉ những gì cần để quyết định có bấm vào hay không. */
export function ShowcaseContestCard({ contest }: { contest: ShowcaseContest }) {
  const format = CONTEST_FORMATS[contest.profile.format];
  const type = CONTEST_TYPES[contest.profile.type];
  return (
    <article className="group relative flex h-full flex-col gap-3 rounded-2xl border-2 border-primary/15 bg-background p-5 transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-[4px_4px_0_0_var(--brand-blue)]">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs">
          <span className="font-semibold text-primary">{format.name}</span>
          <span className="text-muted-foreground"> · {type.label}</span>
        </p>
        {contest.sample && <SampleBadge />}
      </div>
      <h3 className="text-lg leading-snug font-bold break-words">
        <Link
          href={contestHref(contest.slug)}
          className="rounded after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-ring"
        >
          {contest.title}
        </Link>
      </h3>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <CalendarClock aria-hidden className="size-3.5" />
          {when(contest)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Users aria-hidden className="size-3.5" />
          {contest.participants}
        </span>
      </div>
    </article>
  );
}
