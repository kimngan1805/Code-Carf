import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CircleCheck,
  FileCode2,
  Trophy,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhaseBadge } from "@/features/contests/components/phase-badge";
import { RegistrationFilter } from "@/features/contests/components/registration-filter";
import { getContests } from "@/features/contests/service";
import {
  formatContestDate,
  getContestPhase,
  examPhaseLabels,
  phaseLabels,
  getExamPhase,
  type ContestPhase,
} from "@/features/contests/time";
import { cn } from "@/lib/utils";

const filters = ["all", "upcoming", "live", "ended"] as const;
const registrationFilters = [
  { key: "all", label: "Tất cả" },
  { key: "da", label: "Đã đăng ký" },
  { key: "chua", label: "Chưa đăng ký" },
] as const;
type RegistrationFilter = (typeof registrationFilters)[number]["key"];

/** Giữ cả hai bộ lọc trên URL để chọn bộ lọc này không mất bộ lọc kia. */
function contestsHref(status: string, registration: RegistrationFilter) {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (registration !== "all") params.set("dang-ky", registration);
  const query = params.toString();
  return query ? `/contests?${query}` : "/contests";
}

export default async function ContestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; "dang-ky"?: string }>;
}) {
  const query = await searchParams;
  const active = filters.find((filter) => filter === query.status) ?? "all";
  const registration =
    registrationFilters.find((filter) => filter.key === query["dang-ky"])
      ?.key ?? "all";
  const { contests, serverNow: now } = await getContests();
  const visible = contests.filter(
    (contest) =>
      (active === "all" || getExamPhase(contest, now) === active) &&
      (registration === "all" ||
        contest.registered === (registration === "da")),
  );
  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <section className="relative overflow-hidden rounded-3xl bg-primary px-6 py-8 text-primary-foreground sm:px-9">
        <Trophy
          className="absolute -right-5 -bottom-8 size-48 rotate-12 opacity-10"
          aria-hidden
        />
        <p className="mb-3 text-sm font-semibold text-primary-foreground/80">
          ĐẤU TRƯỜNG CODE
        </p>
        <h1 className="text-3xl font-bold sm:text-4xl">
          Thử sức, bứt phá giới hạn
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-7 text-primary-foreground/85">
          Chọn một cuộc thi, chinh phục thử thách và rèn luyện kỹ năng lập trình
          của bạn.
        </p>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex max-w-full flex-wrap items-stretch gap-2">
          <nav
            aria-label="Lọc cuộc thi"
            className="flex max-w-full gap-1 overflow-x-auto rounded-xl border bg-background p-1"
          >
            {filters.map((filter) => (
              <Link
                key={filter}
                href={contestsHref(filter, registration)}
                aria-current={active === filter ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold focus-visible:outline-2",
                  active === filter
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {filter === "all"
                  ? "Tất cả"
                  : examPhaseLabels[filter as ContestPhase]}
              </Link>
            ))}
          </nav>
          <RegistrationFilter
            active={registration}
            options={registrationFilters.map((filter) => ({
              ...filter,
              href: contestsHref(active, filter.key),
            }))}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {visible.length} cuộc thi
        </p>
      </div>
      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-background px-6 py-16 text-center">
          <Trophy
            className="mx-auto mb-4 size-10 text-muted-foreground"
            aria-hidden
          />
          <h2 className="text-lg font-semibold">Chưa có cuộc thi phù hợp</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Thử chọn trạng thái khác hoặc quay lại sau nhé.
          </p>
          {registration === "da" && (
            <p className="mt-2 text-sm text-muted-foreground">
              Bạn chưa đăng ký cuộc thi nào ở trạng thái này.
            </p>
          )}
          <Button asChild variant="outline" className="mt-5">
            <Link href="/contests">Xem tất cả cuộc thi</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((contest) => (
            <article
              key={contest.id}
              className="group flex h-full min-w-0 flex-col rounded-2xl border-2 border-border bg-background p-6 shadow-sm transition-all duration-200 hover:animate-card-float hover:border-primary hover:shadow-[6px_6px_0_0_var(--brand-blue)] focus-within:border-primary focus-within:shadow-[6px_6px_0_0_var(--brand-blue)] motion-reduce:transition-none motion-reduce:hover:animate-none motion-reduce:hover:-translate-y-1"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <PhaseBadge phase={getExamPhase(contest, now)} />
                    {contest.registered && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                        <CircleCheck className="size-3.5" aria-hidden />
                        Đã đăng ký
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {phaseLabels[getContestPhase(contest, now)]}
                  </p>
                </div>
                <Trophy className="size-6 text-accent-strong" aria-hidden />
              </div>
              <h2 className="mt-5 break-words text-xl font-bold text-primary">
                <Link
                  href={`/contests/${contest.slug}`}
                  className="focus-visible:outline-2"
                >
                  {contest.title}
                </Link>
              </h2>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                {contest.description ||
                  "Thử thách lập trình đang chờ bạn khám phá."}
              </p>
              <dl className="mt-6 space-y-3 text-sm">
                <div className="flex gap-2">
                  <CalendarDays
                    className="size-4 shrink-0 text-primary"
                    aria-hidden
                  />
                  <dt className="sr-only">Mở đăng ký</dt>
                  <dd>Mở đăng ký: {formatContestDate(contest.startsAt)}</dd>
                </div>
                <div className="flex gap-5">
                  <div className="flex items-center gap-2">
                    <FileCode2 className="size-4 text-primary" aria-hidden />
                    <dt className="sr-only">Số bài</dt>
                    <dd>{contest._count.exercises} bài</dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="size-4 text-primary" aria-hidden />
                    <dt className="sr-only">Đăng ký</dt>
                    <dd>{contest._count.participants} thí sinh</dd>
                  </div>
                </div>
              </dl>
              <p className="mt-3 text-sm text-muted-foreground">
                Làm bài: {contest.durationMinutes} phút từ khi bắt đầu.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Giờ thi: {formatContestDate(contest.examStartsAt)} →{" "}
                {formatContestDate(contest.examEndsAt)}
              </p>
              <div aria-hidden className="min-h-6 flex-1" />
              <Button
                asChild
                variant="outline"
                className="mt-auto w-full group-hover:border-primary group-hover:text-primary"
              >
                <Link href={`/contests/${contest.slug}`}>
                  Xem chi tiết <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
            </article>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Thời gian hiển thị theo múi giờ Việt Nam (UTC+7).
      </p>
    </div>
  );
}
