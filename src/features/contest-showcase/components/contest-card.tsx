import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  Clock3,
  CodeXml,
  Trophy,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatContestDate,
  phaseLabels,
  type ContestPhase,
} from "@/features/contests/time";
import type { PublicContest } from "../service";

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
export function ContestCard({
  contest,
  featured = false,
}: {
  contest: PublicContest;
  featured?: boolean;
}) {
  const href = `/thi-dau/${encodeURIComponent(contest.slug)}`;
  return (
    <article
      className={`group flex min-w-0 flex-col overflow-hidden rounded-3xl border bg-background transition-shadow hover:shadow-lg ${featured ? "md:grid md:grid-cols-[0.8fr_1.2fr]" : ""}`}
    >
      <div
        aria-hidden
        className={`relative grid place-items-center overflow-hidden bg-gradient-to-br from-secondary/80 via-secondary/30 to-muted p-8 ${featured ? "min-h-64" : "h-40"}`}
      >
        <div className="absolute size-48 rounded-full border border-primary/10" />
        <div className="absolute size-64 rounded-full border border-primary/10" />
        <div
          className={`relative grid rotate-[-8deg] place-items-center rounded-3xl bg-background shadow-xl transition-transform group-hover:rotate-0 ${featured ? "size-32" : "size-20"}`}
        >
          <Trophy
            className={`${featured ? "size-16" : "size-10"} text-accent-strong`}
            strokeWidth={1.5}
          />
        </div>
        <CodeXml className="absolute top-7 right-8 size-6 text-primary/50" />
        {featured && (
          <span className="absolute bottom-5 left-5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
            TÂM ĐIỂM THI ĐẤU
          </span>
        )}
      </div>
      <div
        className={`flex min-w-0 flex-1 flex-col ${featured ? "p-6 sm:p-8" : "p-5"}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <PublicPhase phase={contest.phase} />
          <span className="text-xs text-muted-foreground">
            {phaseLabels[contest.registrationPhase]}
          </span>
        </div>
        <h3
          className={`mt-4 font-bold break-words text-primary ${featured ? "text-2xl sm:text-3xl" : "text-xl"}`}
        >
          <Link
            href={href}
            className="rounded focus-visible:outline-2 focus-visible:outline-ring"
          >
            {contest.title}
          </Link>
        </h3>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
          {contest.description ||
            "Khám phá thử thách lập trình, rèn tư duy giải quyết vấn đề và thử sức cùng cộng đồng Code Carf."}
        </p>
        <dl className="mt-5 space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <CalendarDays
              className="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden
            />
            <div>
              <dt className="text-xs text-muted-foreground">
                Bắt đầu thi · giờ Việt Nam
              </dt>
              <dd className="mt-1 font-medium">
                <PublicDate value={contest.examStartsAt} />
              </dd>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <div className="flex items-center gap-2">
              <Clock3 className="size-4 text-primary" aria-hidden />
              <dt className="sr-only">Thời lượng</dt>
              <dd>{contest.durationMinutes} phút / thí sinh</dd>
            </div>
            <div className="flex items-center gap-2">
              <CodeXml className="size-4 text-primary" aria-hidden />
              <dt className="sr-only">Số đề</dt>
              <dd>{contest.exercises} đề</dd>
            </div>
            <div className="flex items-center gap-2">
              <Users className="size-4 text-primary" aria-hidden />
              <dt className="sr-only">Lượt đăng ký</dt>
              <dd>{contest.participants} đăng ký</dd>
            </div>
          </div>
        </dl>
        <div className="mt-auto pt-6">
          <Button
            asChild
            variant={featured ? "default" : "outline"}
            className="w-full rounded-full sm:w-auto"
          >
            <Link href={href}>
              Khám phá cuộc thi
              <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
