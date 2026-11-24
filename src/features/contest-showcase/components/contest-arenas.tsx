/**
 * Mỗi hình thức thi đấu có một "đấu trường" minh họa riêng trên trang chi tiết,
 * để cuộc thi trông như một trò chơi chứ không chỉ là danh sách thông tin.
 * Số liệu trong đấu trường là dữ liệu mẫu cho giai đoạn duyệt giao diện.
 */
import {
  Check,
  Crown,
  Flame,
  Lock,
  Play,
  Plus,
  Swords,
  Target,
  Timer,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CONTEST_FORMATS,
  QUESTION_TYPES,
  formatDuration,
  type ShowcaseContest,
  type ShowcaseEntry,
} from "../catalog";
import { ContestJourneyMap } from "./contest-journey";

const FALLBACK_PEOPLE: ShowcaseEntry[] = [
  { name: "Minh Anh", school: "ĐH Bách khoa" },
  { name: "Quốc Huy", school: "ĐH Khoa học Tự nhiên" },
  { name: "Thảo Vy", school: "ĐH Sư phạm" },
  { name: "Gia Bảo", school: "ĐH Công nghệ Thông tin" },
  { name: "Ngọc Hân", school: "ĐH Cần Thơ" },
  { name: "Đức Trí", school: "ĐH FPT" },
  { name: "Khánh Linh", school: "ĐH Đà Nẵng" },
  { name: "Hoàng Nam", school: "ĐH Huế" },
];

function peopleOf(contest: ShowcaseContest, count: number) {
  const pool = [...contest.people, ...FALLBACK_PEOPLE].filter(
    (person, index, list) =>
      list.findIndex((other) => other.name === person.name) === index,
  );
  return pool.slice(0, count);
}

function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-full border-2 border-background bg-brand-sky-light font-bold text-primary shadow",
        className,
      )}
    >
      {name.charAt(0)}
    </span>
  );
}

function ArenaFrame({
  contest,
  title,
  subtitle,
  children,
  className,
}: {
  contest: ShowcaseContest;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
}) {
  const format = CONTEST_FORMATS[contest.profile.format];
  return (
    <section
      aria-labelledby="arena-title"
      className="overflow-hidden rounded-[2rem] border-2 border-primary bg-background shadow-[6px_6px_0_0_var(--brand-blue)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-primary px-6 py-4">
        <div className="flex items-center gap-3">
          <span aria-hidden className="text-3xl">
            {format.art}
          </span>
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-accent-strong uppercase">
              {format.label}
            </p>
            <h2 id="arena-title" className="text-xl font-bold">
              {title}
            </h2>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className={cn("relative", className)}>{children}</div>
    </section>
  );
}

/** 1vs1: hai thí sinh đối mặt, chữ VS ở giữa, các hiệp đấu bên dưới. */
function DuelArena({ contest }: { contest: ShowcaseContest }) {
  const [left, right] = peopleOf(contest, 2);
  const rounds = ["win", "lose", "win", "live", "next"] as const;
  return (
    <ArenaFrame
      contest={contest}
      title="Đấu trường tay đôi"
      subtitle="Ghép cặp theo hạng · Thắng 3 hiệp là thắng trận"
      className="bg-gradient-to-br from-primary via-brand-blue to-brand-sky px-6 py-10 text-primary-foreground"
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-1/2 w-24 -translate-x-1/2 skew-x-[-12deg] bg-background/10"
      />
      <div className="relative grid items-center gap-6 sm:grid-cols-[1fr_auto_1fr]">
        {[left, right].map((person, index) => (
          <div
            key={person.name}
            className={cn(
              "flex items-center gap-4 rounded-3xl border-2 border-primary-foreground/40 bg-background/10 p-4 backdrop-blur",
              index === 0
                ? "order-1"
                : "order-3 sm:flex-row-reverse sm:text-right",
            )}
          >
            <Avatar
              name={person.name}
              className={cn(
                "size-16 text-2xl",
                index === 1 && "bg-brand-orange text-primary-foreground",
              )}
            />
            <div>
              <p className="text-lg font-bold">{person.name}</p>
              <p className="text-xs text-primary-foreground/75">
                {person.school}
              </p>
              <p className="mt-1 text-xs font-semibold">
                {index === 0
                  ? "Hạng Vàng · 62% thắng"
                  : "Hạng Vàng · 58% thắng"}
              </p>
            </div>
          </div>
        ))}
        <span className="order-2 mx-auto grid size-20 rotate-[-8deg] place-items-center rounded-2xl border-4 border-background bg-brand-orange text-3xl font-black text-primary-foreground shadow-[4px_4px_0_0_rgb(0_0_0/0.25)]">
          VS
        </span>
      </div>
      <div className="relative mt-8 flex flex-wrap items-center justify-center gap-2">
        {rounds.map((round, index) => (
          <span
            key={index}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
              round === "win" && "bg-background text-primary",
              round === "lose" && "bg-background/20 text-primary-foreground",
              round === "live" &&
                "animate-pulse bg-brand-orange text-primary-foreground",
              round === "next" &&
                "border border-dashed border-primary-foreground/50 text-primary-foreground/70",
            )}
          >
            Hiệp {index + 1}
            {round === "win" && <Check aria-hidden className="size-3.5" />}
            {round === "live" && " · đang đấu"}
          </span>
        ))}
      </div>
      <p className="relative mt-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-background px-5 py-2.5 text-sm font-bold text-primary">
          <Swords aria-hidden className="size-4" /> Vào hàng chờ ghép cặp
        </span>
      </p>
    </ArenaFrame>
  );
}

/** Team: hai đội hai bên, thanh kéo co ở giữa cho thấy đội nào đang dẫn. */
function TeamArena({ contest }: { contest: ShowcaseContest }) {
  const people = peopleOf(contest, 8);
  const teams = [
    {
      name: "Đội Sóng Xanh",
      score: 820,
      members: people.slice(0, 4),
      tone: "bg-primary text-primary-foreground",
    },
    {
      name: "Đội Lửa Cam",
      score: 640,
      members: people.slice(4, 8),
      tone: "bg-brand-orange text-primary-foreground",
    },
  ];
  const share = Math.round(
    (teams[0].score / (teams[0].score + teams[1].score)) * 100,
  );
  return (
    <ArenaFrame
      contest={contest}
      title="Chiến trường đội"
      subtitle={`${contest.participants} người · chia đội 2 đến 4 người`}
      className="p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {teams.map((team, index) => (
          <div
            key={team.name}
            className={cn(
              "relative overflow-hidden rounded-3xl p-5",
              team.tone,
            )}
          >
            <span
              aria-hidden
              className="absolute -right-4 -bottom-6 text-8xl opacity-20"
            >
              {index === 0 ? "🌊" : "🔥"}
            </span>
            <p className="text-xs font-semibold opacity-80">
              {index === 0 ? "Đang dẫn" : "Bám đuổi"}
            </p>
            <p className="text-xl font-bold">{team.name}</p>
            <p className="mt-1 text-3xl font-black">{team.score}</p>
            <div className="mt-4 flex -space-x-2">
              {team.members.map((member) => (
                <Avatar
                  key={member.name}
                  name={member.name}
                  className="size-9 text-sm"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6">
        <p className="mb-2 flex justify-between text-xs font-semibold">
          <span className="text-primary">{share}%</span>
          <span>Kéo co điểm số</span>
          <span className="text-accent-strong">{100 - share}%</span>
        </p>
        <div className="relative flex h-5 overflow-hidden rounded-full border-2 border-primary">
          <span className="bg-primary" style={{ width: `${share}%` }} />
          <span className="flex-1 bg-brand-orange" />
          <span
            aria-hidden
            className="absolute top-1/2 grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-primary bg-background text-xs"
            style={{ left: `${share}%` }}
          >
            🪢
          </span>
        </div>
      </div>
    </ArenaFrame>
  );
}

const TIERS = [
  { name: "Đồng", art: "🥉", points: 0 },
  { name: "Bạc", art: "🥈", points: 500 },
  { name: "Vàng", art: "🥇", points: 1000 },
  { name: "Bạch kim", art: "💠", points: 1500 },
  { name: "Kim cương", art: "💎", points: 2200 },
  { name: "Cao thủ", art: "👑", points: 3000 },
];

/** Ranked: bậc thang hạng, vị trí hiện tại và các trận gần nhất. */
function RankedArena({ contest }: { contest: ShowcaseContest }) {
  const points = 1240;
  const current = TIERS.reduce(
    (found, tier, index) => (points >= tier.points ? index : found),
    0,
  );
  const next = TIERS[current + 1];
  const progress = next
    ? ((points - TIERS[current].points) /
        (next.points - TIERS[current].points)) *
      100
    : 100;
  return (
    <ArenaFrame
      contest={contest}
      title="Leo hạng mùa này"
      subtitle="Thắng cộng điểm, thua trừ điểm · Mùa kết thúc sau 3 tuần"
      className="p-6"
    >
      <ol className="flex items-end justify-between gap-1 sm:gap-3">
        {TIERS.map((tier, index) => (
          <li
            key={tier.name}
            className="flex flex-1 flex-col items-center gap-2"
          >
            <span
              className={cn(
                "grid place-items-center rounded-2xl border-2 transition-transform",
                index === current
                  ? "size-16 -translate-y-2 border-primary bg-brand-sky-light text-4xl shadow-[4px_4px_0_0_var(--brand-blue)] sm:size-20 sm:text-5xl"
                  : index < current
                    ? "size-12 border-primary/30 bg-background text-2xl sm:size-14 sm:text-3xl"
                    : "size-12 border-dashed border-primary/30 bg-muted text-2xl opacity-50 grayscale sm:size-14 sm:text-3xl",
              )}
              aria-hidden
            >
              {tier.art}
            </span>
            <span
              className={cn(
                "text-center text-[11px] font-semibold sm:text-xs",
                index === current ? "text-primary" : "text-muted-foreground",
              )}
            >
              {tier.name}
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-6 rounded-2xl bg-brand-sky-light/40 p-4">
        <p className="flex flex-wrap justify-between gap-2 text-sm">
          <span>
            Đang ở{" "}
            <strong className="text-primary">{TIERS[current].name}</strong>
          </span>
          {next && (
            <span className="text-muted-foreground">
              {points} / {next.points} điểm để lên <strong>{next.name}</strong>
            </span>
          )}
        </p>
        <span className="mt-2 block h-3 overflow-hidden rounded-full bg-background">
          <span
            className="block h-full rounded-full bg-[repeating-linear-gradient(135deg,var(--brand-sky)_0_6px,#5ccbff_6px_12px)]"
            style={{ width: `${progress}%` }}
          />
        </span>
        <p className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-muted-foreground">
            Trận gần đây:
          </span>
          {[25, 18, -12, 22, -9].map((delta, index) => (
            <span
              key={index}
              className={cn(
                "rounded-full px-2.5 py-0.5 font-bold",
                delta > 0
                  ? "bg-success/15 text-success"
                  : "bg-destructive/10 text-destructive",
              )}
            >
              {delta > 0 ? `+${delta}` : delta}
            </span>
          ))}
        </p>
      </div>
    </ArenaFrame>
  );
}

/** Tournament: nhánh đấu loại trực tiếp từ 8 người tới nhà vô địch. */
function BracketArena({ contest }: { contest: ShowcaseContest }) {
  const players = peopleOf(contest, 8).map((person) => person.name);
  const rounds = [
    {
      name: contest.profile.rounds.at(-3) ?? "Tứ kết",
      matches: [
        [0, 1],
        [2, 3],
        [4, 5],
        [6, 7],
      ],
      winners: [0, 3, 4, 6],
    },
    {
      name: contest.profile.rounds.at(-2) ?? "Bán kết",
      matches: [
        [0, 3],
        [4, 6],
      ],
      winners: [0, 6],
    },
    {
      name: contest.profile.rounds.at(-1) ?? "Chung kết",
      matches: [[0, 6]],
      winners: [] as number[],
    },
  ];
  return (
    <ArenaFrame
      contest={contest}
      title="Nhánh đấu loại trực tiếp"
      subtitle="Thắng đi tiếp, thua dừng lại · Chung kết đang chờ"
      className="overflow-x-auto p-6"
    >
      <div className="grid min-w-[40rem] grid-cols-[1fr_1fr_1fr_auto] items-center gap-6">
        {rounds.map((round) => (
          <div
            key={round.name}
            className="flex h-full flex-col justify-around gap-4"
          >
            <p className="text-center text-xs font-bold tracking-wide text-muted-foreground uppercase">
              {round.name}
            </p>
            {round.matches.map((match, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-xl border-2 border-primary/30 bg-background text-sm"
              >
                {match.map((player) => {
                  const won = round.winners.includes(player);
                  return (
                    <p
                      key={player}
                      className={cn(
                        "flex items-center justify-between gap-2 px-3 py-1.5 [&+&]:border-t",
                        won && "bg-brand-sky-light/60 font-bold text-primary",
                        !won &&
                          round.winners.length > 0 &&
                          "text-muted-foreground line-through decoration-1",
                      )}
                    >
                      {players[player]}
                      {won && <Check aria-hidden className="size-3.5" />}
                    </p>
                  );
                })}
              </div>
            ))}
          </div>
        ))}
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="grid size-20 rotate-[-6deg] place-items-center rounded-3xl border-2 border-primary bg-brand-orange/20 text-5xl shadow-[4px_4px_0_0_var(--brand-blue)]">
            🏆
          </span>
          <p className="text-xs font-bold">Nhà vô địch</p>
          <p className="text-xs text-muted-foreground">Đang chờ chung kết</p>
        </div>
      </div>
    </ArenaFrame>
  );
}

/** Daily: dải 7 ngày với chuỗi lửa và thẻ thử thách hôm nay. */
function DailyArena({ contest }: { contest: ShowcaseContest }) {
  const days = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const today = 5;
  return (
    <ArenaFrame
      contest={contest}
      title="Thử thách hôm nay"
      subtitle="Thử thách mới mở lúc 0 giờ mỗi ngày"
      className="grid gap-6 p-6 md:grid-cols-[1fr_auto]"
    >
      <div>
        <p className="inline-flex items-center gap-2 rounded-full bg-brand-orange/15 px-3 py-1 text-sm font-bold text-accent-strong">
          <Flame aria-hidden className="size-4" /> Chuỗi 5 ngày
        </p>
        <ol className="mt-4 grid grid-cols-7 gap-2">
          {days.map((day, index) => (
            <li key={day} className="flex flex-col items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground">
                {day}
              </span>
              <span
                className={cn(
                  "grid size-11 place-items-center rounded-2xl border-2 text-xl sm:size-14 sm:text-2xl",
                  index < today && "border-accent bg-brand-orange/15",
                  index === today &&
                    "animate-pulse border-primary bg-brand-sky-light",
                  index > today && "border-dashed border-primary/30 bg-muted",
                )}
                aria-label={
                  index < today
                    ? `${day}: đã hoàn thành`
                    : index === today
                      ? `${day}: hôm nay`
                      : `${day}: chưa mở`
                }
              >
                {index < today ? (
                  "🔥"
                ) : index === today ? (
                  "⭐"
                ) : (
                  <Lock aria-hidden className="size-4 text-muted-foreground" />
                )}
              </span>
            </li>
          ))}
        </ol>
      </div>
      <div className="rounded-3xl border-2 border-primary bg-brand-sky-light/40 p-5 md:w-64">
        <p className="text-xs font-semibold text-muted-foreground">Hôm nay</p>
        <p className="mt-1 font-bold">
          {contest.profile.sections[0]?.title ?? "Thử thách"}
        </p>
        <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
          {contest.profile.sections.map((section) => (
            <li key={section.title}>
              · {section.count}{" "}
              {QUESTION_TYPES[section.questionType].toLowerCase()}
            </li>
          ))}
        </ul>
        <p className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
          <Play aria-hidden className="size-4 fill-current" /> Làm ngay
        </p>
      </div>
    </ArenaFrame>
  );
}

/** Friendly: phòng chờ có mã phòng và các ghế ngồi. */
function FriendlyArena({ contest }: { contest: ShowcaseContest }) {
  const seated = peopleOf(contest, 4);
  const seats = 6;
  return (
    <ArenaFrame
      contest={contest}
      title="Phòng giao hữu"
      subtitle="Không tính hạng · Chủ phòng bấm bắt đầu khi đủ người"
      className="p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm">
          Mã phòng{" "}
          <span className="ml-2 rounded-xl border-2 border-dashed border-primary bg-brand-sky-light/40 px-3 py-1.5 font-mono text-lg font-bold tracking-[0.2em] text-primary">
            CC-7F3K
          </span>
        </p>
        <span className="inline-flex items-center gap-2 rounded-full border-2 border-primary px-4 py-2 text-sm font-semibold text-primary">
          <UserPlus aria-hidden className="size-4" /> Mời bạn bè
        </span>
      </div>
      <ul className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {Array.from({ length: seats }, (_, index) => {
          const person = seated[index];
          return (
            <li
              key={index}
              className={cn(
                "flex flex-col items-center gap-2 rounded-2xl border-2 p-3 text-center",
                person
                  ? "border-primary bg-background"
                  : "border-dashed border-primary/30 bg-muted/50",
              )}
            >
              {person ? (
                <>
                  <Avatar name={person.name} className="size-12 text-lg" />
                  <span className="text-xs font-semibold">{person.name}</span>
                  {index === 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-accent-strong">
                      <Crown aria-hidden className="size-3" /> Chủ phòng
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="grid size-12 place-items-center rounded-full border-2 border-dashed border-primary/40 text-primary/50">
                    <Plus aria-hidden className="size-5" />
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Ghế trống
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </ArenaFrame>
  );
}

/** Classroom: bảng lớp học với tiến độ từng bạn trong lớp. */
function ClassroomArena({ contest }: { contest: ShowcaseContest }) {
  const students = peopleOf(contest, 5);
  const progress = [100, 88, 75, 50, 25];
  return (
    <ArenaFrame
      contest={contest}
      title="Bảng lớp học"
      subtitle={contest.profile.organizer}
      className="grid gap-6 p-6 md:grid-cols-[1.1fr_1fr]"
    >
      <div className="relative rounded-2xl border-8 border-accent-strong bg-success p-5 text-primary-foreground shadow-inner">
        <p className="font-mono text-xs text-primary-foreground/70">
          Lớp CSDL · Nhóm 02
        </p>
        <p className="mt-2 text-2xl font-bold">{contest.title}</p>
        <ul className="mt-4 space-y-1 font-mono text-sm text-primary-foreground/85">
          {contest.profile.sections.map((section) => (
            <li key={section.title}>
              ✎ {section.count}{" "}
              {QUESTION_TYPES[section.questionType].toLowerCase()}
            </li>
          ))}
          <li>⏱ {formatDuration(contest.durationMinutes)}</li>
        </ul>
        <span aria-hidden className="absolute right-4 bottom-2 text-3xl">
          🍎
        </span>
      </div>
      <div>
        <p className="mb-3 text-sm font-bold">Tiến độ cả lớp</p>
        <ul className="space-y-3">
          {students.map((student, index) => (
            <li key={student.name} className="flex items-center gap-3">
              <Avatar name={student.name} className="size-8 text-xs" />
              <span className="w-24 truncate text-sm font-medium">
                {student.name}
              </span>
              <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                <span
                  className={cn(
                    "block h-full rounded-full",
                    progress[index] === 100 ? "bg-success" : "bg-primary",
                  )}
                  style={{ width: `${progress[index]}%` }}
                />
              </span>
              <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
                {progress[index]}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ArenaFrame>
  );
}

/** Solo: bảng nhiệm vụ với đồng hồ vòng tròn và các mục tiêu cần hoàn thành. */
function SoloArena({ contest }: { contest: ShowcaseContest }) {
  const total = contest.profile.totalPoints ?? 100;
  const goal = Math.round(total * 0.8);
  return (
    <ArenaFrame
      contest={contest}
      title="Bảng nhiệm vụ"
      subtitle="Một mình, một đồng hồ, một mục tiêu"
      className="grid items-center gap-8 p-6 md:grid-cols-[auto_1fr]"
    >
      <div className="relative mx-auto size-40">
        <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden>
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="var(--muted)"
            strokeWidth="12"
          />
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="var(--brand-sky)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 52 * 0.72} ${2 * Math.PI * 52}`}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-center">
          <span>
            <Timer aria-hidden className="mx-auto size-5 text-primary" />
            <span className="block text-xl font-black">
              {formatDuration(contest.durationMinutes)}
            </span>
            <span className="text-[11px] text-muted-foreground">
              đồng hồ riêng
            </span>
          </span>
        </span>
      </div>
      <div>
        <ol className="space-y-2.5">
          {contest.profile.sections.map((section, index) => (
            <li
              key={section.title}
              className="flex items-center gap-3 rounded-2xl border-2 border-primary/15 bg-background px-4 py-3"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-brand-sky-light/60 text-sm font-bold text-primary">
                {index + 1}
              </span>
              <span className="flex-1 text-sm">
                <span className="block font-semibold">{section.title}</span>
                <span className="text-xs text-muted-foreground">
                  {section.count}{" "}
                  {QUESTION_TYPES[section.questionType].toLowerCase()}
                </span>
              </span>
              {section.points !== undefined && (
                <span className="text-sm font-bold text-primary">
                  +{section.points}
                </span>
              )}
            </li>
          ))}
        </ol>
        <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-orange/15 px-3 py-1.5 text-sm font-semibold text-accent-strong">
          <Target aria-hidden className="size-4" />
          Mục tiêu: đạt {goal}/{total} điểm để nhận{" "}
          {contest.profile.rewards.find((reward) => reward.kind !== "xp")
            ?.title ?? "phần thưởng"}
        </p>
      </div>
    </ArenaFrame>
  );
}

/** Chọn đấu trường theo hình thức; cuộc thi có hành trình dùng bản đồ đảo. */
export function ContestArena({ contest }: { contest: ShowcaseContest }) {
  if (contest.profile.journey)
    return <ContestJourneyMap journey={contest.profile.journey} />;
  switch (contest.profile.format) {
    case "duel":
      return <DuelArena contest={contest} />;
    case "team":
      return <TeamArena contest={contest} />;
    case "ranked":
      return <RankedArena contest={contest} />;
    case "tournament":
      return <BracketArena contest={contest} />;
    case "daily":
      return <DailyArena contest={contest} />;
    case "friendly":
      return <FriendlyArena contest={contest} />;
    case "classroom":
      return <ClassroomArena contest={contest} />;
    case "solo":
      return <SoloArena contest={contest} />;
  }
}
