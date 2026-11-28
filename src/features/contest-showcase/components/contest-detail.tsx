import Link from "next/link";
import {
  Award,
  BadgeCheck,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Gauge,
  Gift,
  ListChecks,
  Medal,
  Sparkles,
  Target,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { phaseLabels } from "@/features/contests/time";
import {
  CONTEST_FORMATS,
  CONTEST_LEVELS,
  CONTEST_TYPES,
  QUESTION_TYPES,
  formatDuration,
  questionCount,
  type ContestReward,
  type ShowcaseContest,
} from "../catalog";
import { PublicDate, PublicPhase } from "./contest-card";
import { ContestArt, FormatChip, SampleBadge } from "./contest-kinds";
import { ContestTabs } from "./contest-tabs";

const REWARD_ICONS: Record<ContestReward["kind"], LucideIcon> = {
  xp: Sparkles,
  badge: Medal,
  certificate: BadgeCheck,
  prize: Gift,
};

function Panel({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-3xl border-2 border-primary/20 bg-background p-6",
        className,
      )}
    >
      <h3 className="flex items-center gap-2 font-bold">
        {Icon && <Icon aria-hidden className="size-5 text-primary" />}
        {title}
      </h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5 text-sm">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-success/15 text-success">
            <Check aria-hidden className="size-3.5" strokeWidth={3} />
          </span>
          <span className="text-muted-foreground">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-3xl border-2 border-dashed border-primary/30 p-10 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

export function ContestDetailHero({ contest }: { contest: ShowcaseContest }) {
  const { profile } = contest;
  const type = CONTEST_TYPES[profile.type];
  const facts: { icon: LucideIcon; label: string; value: string }[] = [
    ...(profile.level
      ? [{ icon: Gauge, label: "Độ khó", value: CONTEST_LEVELS[profile.level] }]
      : []),
    {
      icon: Clock3,
      label: "Thời lượng",
      value: formatDuration(contest.durationMinutes),
    },
    {
      icon: Users,
      label: "Hình thức",
      value: CONTEST_FORMATS[profile.format].label,
    },
    {
      icon: ListChecks,
      label: profile.type === "coding" ? "Bài thi" : "Câu hỏi",
      value: `${questionCount(contest)} ${profile.type === "coding" ? "bài" : "câu"}`,
    },
    ...(profile.totalPoints
      ? [
          {
            icon: Target,
            label: "Tổng điểm",
            value: `${profile.totalPoints} điểm`,
          },
        ]
      : []),
    ...(profile.rewards[0]
      ? [
          {
            icon: Trophy,
            label: "Phần thưởng",
            value: profile.rewards[0].title,
          },
        ]
      : []),
  ];
  return (
    <header>
      <nav aria-label="Đường dẫn" className="text-sm">
        <ol className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
          <li>
            <Link href="/thi-dau#kham-pha" className="hover:text-primary">
              Khám phá thi đấu
            </Link>
          </li>
          <li aria-hidden>
            <ChevronRight className="size-4" />
          </li>
          <li aria-current="page" className="font-medium text-foreground">
            {contest.title}
          </li>
        </ol>
      </nav>
      <div className="group relative mt-6 overflow-hidden rounded-[2rem] border-2 border-primary bg-background p-6 shadow-[6px_6px_0_0_var(--brand-blue)] sm:p-10">
        <span
          aria-hidden
          className={cn(
            "absolute -top-10 -right-10 h-[130%] w-[34%] rounded-l-[45%]",
            type.tone,
          )}
        />
        <div className="absolute top-12 right-[9%] hidden lg:block">
          <ContestArt type={profile.type} size="lg" />
        </div>
        <div className="relative lg:w-[68%]">
          <div className="flex flex-wrap items-center gap-2">
            <PublicPhase phase={contest.phase} />
            <span className="text-xs font-semibold text-muted-foreground">
              {type.name} · {type.label}
            </span>
            {contest.sample && <SampleBadge />}
          </div>
          {profile.topics.length > 0 && (
            <p className="mt-4 text-sm font-semibold text-primary">
              {profile.topics.map((topic) => `#${topic}`).join(" · ")}
            </p>
          )}
          <h1 className="mt-2 text-3xl leading-tight font-bold break-words sm:text-5xl">
            {contest.title}
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            {contest.description ||
              "Thông tin giới thiệu đang được ban tổ chức cập nhật."}
          </p>
          <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {facts.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="rounded-2xl border-2 border-primary/15 bg-background/80 px-4 py-3"
              >
                <dt className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon aria-hidden className="size-3.5 text-primary" />
                  {label}
                </dt>
                <dd className="mt-1 font-bold">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </header>
  );
}

/** Nút đăng ký dẫn vào khu vực thí sinh; khách chưa đăng nhập được route guard chuyển sang đăng nhập rồi quay lại. */
function RegisterAction({ contest }: { contest: ShowcaseContest }) {
  // Cuộc thi chỉ có ở giao diện (không có trong cơ sở dữ liệu) thì quay về danh sách cuộc thi thật.
  const target = contest.sample
    ? "/contests"
    : `/contests/${encodeURIComponent(contest.slug)}`;
  return (
    <>
      <Button asChild size="lg" className="w-full rounded-full">
        <Link href={target}>
          {contest.registrationPhase === "live"
            ? "Đăng ký tham gia"
            : "Vào khu vực thí sinh"}
        </Link>
      </Button>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Bạn sẽ được yêu cầu đăng nhập bằng tài khoản học viên nếu chưa đăng
        nhập.
      </p>
    </>
  );
}

export function ContestDetailAside({ contest }: { contest: ShowcaseContest }) {
  // Mốc đã qua suy ra từ trạng thái, không đọc giờ hệ thống lúc render.
  const reg = contest.registrationPhase;
  const exam = contest.phase;
  const steps = [
    {
      label: "Mở đăng ký",
      value: contest.registrationOpensAt,
      passed: reg === "live" || reg === "ended",
    },
    {
      label: "Đóng đăng ký",
      value: contest.registrationClosesAt,
      passed: reg === "ended",
    },
    {
      label: "Bắt đầu thi",
      value: contest.examStartsAt,
      passed: exam === "live" || exam === "ended",
    },
    { label: "Kết thúc", value: contest.examEndsAt, passed: exam === "ended" },
  ];
  return (
    <aside className="space-y-4 lg:sticky lg:top-24">
      <div className="rounded-3xl border-2 border-primary bg-background p-6 shadow-[6px_6px_0_0_var(--brand-blue)]">
        <h2 className="flex items-center gap-2 font-bold">
          <CalendarDays aria-hidden className="size-5 text-primary" />
          Lịch cuộc thi
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Giờ Việt Nam (UTC+7) · {phaseLabels[contest.registrationPhase]}
        </p>
        <ol className="mt-5 space-y-0">
          {steps.map((step, index) => {
            const { passed } = step;
            return (
              <li
                key={step.label}
                className="relative flex gap-3 pb-5 last:pb-0"
              >
                {index < steps.length - 1 && (
                  <span
                    aria-hidden
                    className={cn(
                      "absolute top-5 left-[9px] h-full w-0.5",
                      passed ? "bg-primary" : "bg-border",
                    )}
                  />
                )}
                <span
                  aria-hidden
                  className={cn(
                    "relative mt-0.5 size-5 shrink-0 rounded-full border-2",
                    passed
                      ? "border-primary bg-primary"
                      : "border-primary/40 bg-background",
                  )}
                />
                <span className="text-sm">
                  <span className="block font-semibold">{step.label}</span>
                  <span className="text-muted-foreground">
                    <PublicDate value={step.value} />
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
        <div className="mt-6">
          {contest.phase === "ended" ? (
            <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
              Cuộc thi đã kết thúc. Hẹn bạn ở thử thách tiếp theo!
            </p>
          ) : (
            <RegisterAction contest={contest} />
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-3xl border-2 border-primary/20 bg-background p-5">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-sky-light/60 text-primary">
          <Building2 aria-hidden className="size-5" />
        </span>
        <span>
          <span className="block text-xs text-muted-foreground">
            Đơn vị tổ chức
          </span>
          <span className="font-semibold">{contest.profile.organizer}</span>
        </span>
      </div>
    </aside>
  );
}

function OverviewTab({ contest }: { contest: ShowcaseContest }) {
  const { profile } = contest;
  const type = CONTEST_TYPES[profile.type];
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Panel title="Giới thiệu cuộc thi" className="md:col-span-2">
        <p className="text-sm leading-7 whitespace-pre-wrap text-muted-foreground">
          {contest.description ||
            "Thông tin giới thiệu đang được ban tổ chức cập nhật."}
        </p>
      </Panel>
      <Panel title="Mục tiêu" icon={Target}>
        <CheckList items={profile.goals} />
      </Panel>
      <Panel title="Loại cuộc thi" icon={Award}>
        <p className="text-sm font-semibold">
          {type.name} · {type.label}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{type.description}</p>
        <p className="mt-3 text-sm">
          <span className="font-semibold text-primary">Đánh giá: </span>
          <span className="text-muted-foreground">{type.criteria}</span>
        </p>
      </Panel>
      <Panel title="Đối tượng tham gia" icon={Users}>
        <p className="text-sm text-muted-foreground">{profile.audience}</p>
        <div className="mt-3">
          <FormatChip format={profile.format} />
          <p className="mt-2 text-xs text-muted-foreground">
            {CONTEST_FORMATS[profile.format].description}
          </p>
        </div>
      </Panel>
      <Panel title="Điều kiện tham gia" icon={BadgeCheck}>
        {profile.requirements.length > 0 ? (
          <CheckList items={profile.requirements} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Không có điều kiện riêng. Ai cũng có thể tham gia.
          </p>
        )}
      </Panel>
    </div>
  );
}

function ContentTab({ contest }: { contest: ShowcaseContest }) {
  const { profile } = contest;
  const total = Math.max(1, questionCount(contest));
  return (
    <div className="space-y-4">
      {profile.topics.length > 0 && (
        <Panel title="Chủ đề">
          <ul className="flex flex-wrap gap-2">
            {profile.topics.map((topic) => (
              <li
                key={topic}
                className="rounded-full border-2 border-primary/20 px-3 py-1 text-sm font-semibold text-primary"
              >
                #{topic}
              </li>
            ))}
          </ul>
        </Panel>
      )}
      <Panel title="Cấu trúc đề thi" icon={ListChecks}>
        <ol className="space-y-4">
          {profile.sections.map((section, index) => (
            <li key={section.title}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm">
                  <span className="mr-2 font-bold text-primary tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="font-semibold">{section.title}</span>
                  <span className="ml-2 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {QUESTION_TYPES[section.questionType]}
                  </span>
                </p>
                <p className="text-sm font-semibold">
                  {section.count}{" "}
                  {section.questionType === "coding" ? "bài" : "câu"}
                  {section.points !== undefined && (
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      · {section.points} điểm
                    </span>
                  )}
                </p>
              </div>
              <span className="mt-2 block h-2.5 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-[repeating-linear-gradient(135deg,var(--brand-sky)_0_6px,#5ccbff_6px_12px)]"
                  style={{
                    width: `${Math.max(6, (section.count / total) * 100)}%`,
                  }}
                />
              </span>
            </li>
          ))}
        </ol>
        {profile.totalPoints && (
          <p className="mt-5 border-t pt-4 text-sm">
            Tổng cộng <strong>{questionCount(contest)}</strong>{" "}
            {profile.type === "coding" ? "bài" : "câu"} ·{" "}
            <strong>{profile.totalPoints} điểm</strong>
          </p>
        )}
      </Panel>
      {profile.rounds.length > 0 && (
        <Panel title="Các vòng thi">
          <ol className="grid gap-3 sm:grid-cols-3">
            {profile.rounds.map((round, index) => (
              <li
                key={round}
                className="rounded-2xl bg-brand-sky-light/40 p-4 text-sm"
              >
                <span className="block text-xs font-bold text-primary">
                  Vòng {index + 1}
                </span>
                <span className="font-semibold">{round}</span>
              </li>
            ))}
          </ol>
        </Panel>
      )}
    </div>
  );
}

function RulesTab({ contest }: { contest: ShowcaseContest }) {
  const { profile } = contest;
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Panel title="Quy định" icon={ListChecks}>
        <CheckList items={profile.rules} />
      </Panel>
      <Panel title="Cách tính điểm" icon={Target}>
        <CheckList items={profile.scoring} />
      </Panel>
      <Panel title="Xếp hạng" icon={Trophy}>
        <CheckList items={profile.ranking} />
      </Panel>
    </div>
  );
}

function ParticipantsTab({ contest }: { contest: ShowcaseContest }) {
  if (contest.people.length === 0)
    return (
      <Empty>
        {contest.participants > 0
          ? `${contest.participants} thí sinh đã đăng ký. Danh sách chỉ hiện với thí sinh trong cuộc thi.`
          : "Chưa có thí sinh đăng ký. Hãy là người đầu tiên!"}
      </Empty>
    );
  return (
    <Panel title={`${contest.participants} thí sinh đã đăng ký`} icon={Users}>
      <ul className="grid gap-3 sm:grid-cols-2">
        {contest.people.map((person) => (
          <li key={person.name} className="flex items-center gap-3">
            <span
              aria-hidden
              className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-primary bg-brand-sky-light font-bold text-primary"
            >
              {person.name.charAt(0)}
            </span>
            <span>
              <span className="block text-sm font-semibold">{person.name}</span>
              <span className="text-xs text-muted-foreground">
                {person.school}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {contest.participants > contest.people.length && (
        <p className="mt-4 text-xs text-muted-foreground">
          và {contest.participants - contest.people.length} thí sinh khác
        </p>
      )}
    </Panel>
  );
}

function LeaderboardTab({ contest }: { contest: ShowcaseContest }) {
  if (contest.phase === "upcoming" || contest.phase === "unscheduled")
    return <Empty>Bảng xếp hạng sẽ mở khi cuộc thi bắt đầu.</Empty>;
  if (!contest.sample)
    return (
      <Empty>
        Bảng xếp hạng trực tiếp dành cho thí sinh.{" "}
        <Link
          href={`/contests/${encodeURIComponent(contest.slug)}/leaderboard`}
          className="font-semibold text-primary underline underline-offset-4"
        >
          Đăng nhập để xem
        </Link>
      </Empty>
    );
  const rows = [...contest.people].sort(
    (a, b) => (b.score ?? 0) - (a.score ?? 0),
  );
  const medals = [
    "bg-brand-orange text-primary-foreground",
    "bg-brand-sky text-primary-foreground",
    "bg-brand-blue text-primary-foreground",
  ];
  return (
    <div className="overflow-hidden rounded-3xl border-2 border-primary bg-background">
      <table className="w-full text-sm">
        <thead className="bg-brand-sky-light/50 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-5 py-3 font-semibold">Hạng</th>
            <th className="px-5 py-3 font-semibold">Thí sinh</th>
            <th className="px-5 py-3 text-right font-semibold">Điểm</th>
            <th className="hidden px-5 py-3 text-right font-semibold sm:table-cell">
              Thời gian
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row, index) => (
            <tr key={row.name}>
              <td className="px-5 py-3">
                <span
                  className={cn(
                    "grid size-7 place-items-center rounded-full text-xs font-bold",
                    medals[index] ?? "bg-muted",
                  )}
                >
                  {index + 1}
                </span>
              </td>
              <td className="px-5 py-3">
                <span className="block font-semibold">{row.name}</span>
                <span className="text-xs text-muted-foreground">
                  {row.school}
                </span>
              </td>
              <td className="px-5 py-3 text-right font-bold text-primary">
                {row.score}
              </td>
              <td className="hidden px-5 py-3 text-right text-muted-foreground tabular-nums sm:table-cell">
                {row.time}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RewardsTab({ contest }: { contest: ShowcaseContest }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {contest.profile.rewards.map((reward) => {
        const Icon = REWARD_ICONS[reward.kind];
        return (
          <li
            key={reward.title}
            className="group relative overflow-hidden rounded-3xl border-2 border-primary bg-background p-6 text-center transition-transform hover:-translate-y-1"
          >
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-16 bg-brand-sky-light/60"
            />
            <span className="relative mx-auto grid size-16 rotate-[-8deg] place-items-center rounded-2xl border-2 border-primary bg-background text-primary shadow-[3px_3px_0_0_var(--brand-blue)] transition-transform group-hover:rotate-0">
              <Icon aria-hidden className="size-8" />
            </span>
            <p className="relative mt-4 text-lg font-bold">{reward.title}</p>
            <p className="relative mt-1 text-sm text-muted-foreground">
              {reward.note}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

export function ContestDetailTabs({ contest }: { contest: ShowcaseContest }) {
  return (
    <ContestTabs
      tabs={[
        {
          id: "tong-quan",
          label: "Tổng quan",
          content: <OverviewTab contest={contest} />,
        },
        {
          id: "noi-dung",
          label: "Nội dung thi",
          content: <ContentTab contest={contest} />,
        },
        {
          id: "the-le",
          label: "Thể lệ",
          content: <RulesTab contest={contest} />,
        },
        {
          id: "nguoi-tham-gia",
          label: "Người tham gia",
          content: <ParticipantsTab contest={contest} />,
        },
        {
          id: "xep-hang",
          label: "Bảng xếp hạng",
          content: <LeaderboardTab contest={contest} />,
        },
        {
          id: "phan-thuong",
          label: "Phần thưởng",
          content: <RewardsTab contest={contest} />,
        },
      ]}
    />
  );
}
