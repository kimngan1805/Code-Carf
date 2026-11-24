import Link from "next/link";
import {
  ArrowRight,
  BookmarkCheck,
  BookOpen,
  Bug,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Code,
  Cog,
  Compass,
  Dumbbell,
  Gauge,
  Layers,
  Lightbulb,
  ListChecks,
  MapPin,
  MonitorPlay,
  Rocket,
  Scale,
  Shapes,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DIFFICULTY_LABELS } from "../cover-themes";
import { formatDuration, formatPostedAt } from "../format";
import type { getPublicPath } from "../service";
import { DifficultyChip, PathArt } from "./path-showcase";

type PublicPath = NonNullable<Awaited<ReturnType<typeof getPublicPath>>>;

type LessonPart = {
  name: string;
  english: string;
  question: string;
  icon: LucideIcon;
};

/**
 * Khung chuẩn của một bài học, chia 4 chặng để người học thấy được hành trình.
 * Hiện là khung giao diện cố định; chưa lưu theo từng bài trong cơ sở dữ liệu.
 */
const LESSON_PHASES: {
  title: string;
  summary: string;
  tone: string;
  parts: LessonPart[];
}[] = [
  {
    title: "Hiểu",
    summary: "Nắm chủ đề là gì",
    tone: "bg-brand-sky-light/60",
    parts: [
      {
        name: "Tổng quan",
        english: "Overview",
        question: "Giới thiệu chủ đề và mục tiêu học tập",
        icon: Compass,
      },
      {
        name: "Khái niệm",
        english: "Concept",
        question: "Kiến thức này là gì?",
        icon: Lightbulb,
      },
      {
        name: "Đặc điểm",
        english: "Characteristics",
        question: "Có những đặc điểm gì?",
        icon: ListChecks,
      },
      {
        name: "Phân loại",
        english: "Classification",
        question: "Bao gồm những loại nào?",
        icon: Shapes,
      },
    ],
  },
  {
    title: "Nắm cách làm",
    summary: "Đọc và viết được code",
    tone: "bg-brand-sky/20",
    parts: [
      {
        name: "Cách thức hoạt động",
        english: "Mechanism",
        question: "Hoạt động như thế nào?",
        icon: Cog,
      },
      {
        name: "Cú pháp",
        english: "Syntax",
        question: "Cách khai báo và sử dụng trong code",
        icon: Code,
      },
      {
        name: "Ví dụ minh họa",
        english: "Example",
        question: "Ví dụ code kèm giải thích",
        icon: MonitorPlay,
      },
    ],
  },
  {
    title: "Vận dụng",
    summary: "Dùng đúng chỗ, tránh lỗi",
    tone: "bg-brand-orange/15",
    parts: [
      {
        name: "Ứng dụng thực tế",
        english: "Application",
        question: "Khi nào và tại sao cần sử dụng?",
        icon: Rocket,
      },
      {
        name: "Ưu và nhược điểm",
        english: "Pros & Cons",
        question: "Điểm mạnh và hạn chế",
        icon: Scale,
      },
      {
        name: "Lỗi thường gặp",
        english: "Common Errors",
        question: "Các lỗi và cách khắc phục",
        icon: Bug,
      },
    ],
  },
  {
    title: "Củng cố",
    summary: "Nhớ lâu, làm được",
    tone: "bg-brand-blue/10",
    parts: [
      {
        name: "Ghi nhớ",
        english: "Key Takeaways",
        question: "Tổng hợp kiến thức trọng tâm",
        icon: BookmarkCheck,
      },
      {
        name: "Luyện tập",
        english: "Practice",
        question: "Trắc nghiệm và bài tập lập trình",
        icon: Dumbbell,
      },
    ],
  },
];

const LESSON_PART_COUNT = LESSON_PHASES.reduce(
  (sum, phase) => sum + phase.parts.length,
  0,
);

/** Số thứ tự 01-12 liên tục qua các chặng. */
const PHASE_OFFSETS = LESSON_PHASES.map((_, index) =>
  LESSON_PHASES.slice(0, index).reduce(
    (sum, phase) => sum + phase.parts.length,
    0,
  ),
);

const startHref = (path: PublicPath) => `/hv/paths/${path.slug}`;

function SectionHeading({
  id,
  kicker,
  title,
  description,
}: {
  id?: string;
  kicker: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6">
      <p className="text-xs font-bold tracking-[0.2em] text-accent-strong uppercase">
        {kicker}
      </p>
      <h2 id={id} className="mt-2 text-2xl font-bold sm:text-3xl">
        {title}
      </h2>
      {description && (
        <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

export function PathDetailHero({ path }: { path: PublicPath }) {
  const duration = formatDuration(path.estimatedMinutes);
  return (
    <section className="bg-gradient-to-b from-secondary/40 via-secondary/10 to-background">
      <div className="mx-auto max-w-6xl px-4 pt-8 pb-12 sm:px-6 sm:pt-10">
        <nav aria-label="Đường dẫn" className="text-sm">
          <ol className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
            <li>
              <Link href="/lo-trinh" className="hover:text-primary">
                Khám phá lộ trình
              </Link>
            </li>
            <li aria-hidden>
              <ChevronRight className="size-4" />
            </li>
            <li aria-current="page" className="font-medium text-foreground">
              {path.title}
            </li>
          </ol>
        </nav>

        <div className="mt-8 grid items-center gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <DifficultyChip difficulty={path.difficulty} />
              {path.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/lo-trinh?tag=${encodeURIComponent(tag)}`}
                  className="rounded-full border-2 border-primary/20 bg-background px-2.5 py-0.5 text-xs font-semibold text-primary hover:border-primary"
                >
                  #{tag}
                </Link>
              ))}
            </div>
            <h1 className="mt-4 text-4xl leading-tight font-bold tracking-tight break-words sm:text-5xl">
              {path.title}
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              {path.description}
            </p>

            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <li className="inline-flex items-center gap-1.5">
                <BookOpen aria-hidden className="size-4 text-primary" />
                <strong>{path.total}</strong> bài học
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Code aria-hidden className="size-4 text-primary" />
                <strong>{path.exercises}</strong> bài tập
              </li>
              {duration && (
                <li className="inline-flex items-center gap-1.5">
                  <Clock aria-hidden className="size-4 text-primary" />
                  <strong>{duration}</strong>
                </li>
              )}
              <li className="inline-flex items-center gap-1.5">
                <Users aria-hidden className="size-4 text-primary" />
                <strong>{path.learners}</strong> học viên
              </li>
            </ul>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="rounded-full px-7">
                <Link href={startHref(path)}>
                  {path.enrolled ? "Tiếp tục học" : "Bắt đầu học"}
                  <ArrowRight aria-hidden className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-2 border-primary px-7 text-primary"
              >
                <a href="#de-cuong">Xem đề cương</a>
              </Button>
            </div>
          </div>

          <div className="group relative hidden h-80 lg:block">
            <span
              aria-hidden
              className="absolute inset-y-0 right-0 w-[85%] rounded-[45%_2rem_2rem_55%] border-2 border-primary bg-brand-sky-light shadow-[6px_6px_0_0_var(--brand-blue)]"
            />
            <div className="absolute top-1/2 left-[42%] -translate-x-1/2 -translate-y-1/2">
              <PathArt path={path} size="lg" />
            </div>
            <p className="absolute right-6 bottom-6 rounded-2xl border-2 border-primary bg-background px-4 py-2 text-sm shadow-[3px_3px_0_0_var(--brand-blue)]">
              <span className="block text-xs text-muted-foreground">
                Mỗi bài học gồm
              </span>
              <strong className="text-primary">
                {LESSON_PART_COUNT} phần, 4 chặng
              </strong>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PathOutcomes({ path }: { path: PublicPath }) {
  const outcomes = path.rooms.slice(0, 6);
  if (outcomes.length === 0) return null;
  return (
    <section aria-labelledby="outcomes-title">
      <SectionHeading
        id="outcomes-title"
        kicker="Mục tiêu"
        title="Bạn sẽ học được gì"
      />
      <ul className="grid gap-3 rounded-3xl border-2 border-primary bg-background p-6 sm:grid-cols-2">
        {outcomes.map((room) => (
          <li key={room.id} className="flex gap-3 text-sm">
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-success/15 text-success">
              <Check aria-hidden className="size-3.5" strokeWidth={3} />
            </span>
            <span>
              <strong className="font-semibold">{room.title}</strong>
              {room.description && (
                <span className="block text-muted-foreground">
                  {room.description}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LessonStructure() {
  return (
    <section aria-labelledby="structure-title">
      <SectionHeading
        id="structure-title"
        kicker="Cách học"
        title={`Mỗi bài học đi qua ${LESSON_PART_COUNT} phần`}
        description="Từ hiểu khái niệm đến tự tay viết code: mọi bài trong lộ trình đều theo cùng một khung, nên bạn luôn biết mình đang ở đâu."
      />
      <ol className="grid gap-5 md:grid-cols-2">
        {LESSON_PHASES.map((phase, phaseIndex) => (
          <li
            key={phase.title}
            className="overflow-hidden rounded-3xl border-2 border-primary bg-background"
          >
            <div
              className={cn(
                "flex items-center gap-3 border-b-2 border-primary px-5 py-4",
                phase.tone,
              )}
            >
              <span className="grid size-9 place-items-center rounded-xl border-2 border-primary bg-background text-sm font-bold text-primary">
                {phaseIndex + 1}
              </span>
              <span>
                <span className="block font-bold">{phase.title}</span>
                <span className="text-xs text-muted-foreground">
                  {phase.summary}
                </span>
              </span>
            </div>
            <ul className="divide-y">
              {phase.parts.map((part, partIndex) => {
                const number = PHASE_OFFSETS[phaseIndex] + partIndex + 1;
                const Icon = part.icon;
                return (
                  <li
                    key={part.name}
                    className="flex items-start gap-3 px-5 py-3.5"
                  >
                    <span className="mt-0.5 w-5 shrink-0 text-xs font-bold text-muted-foreground tabular-nums">
                      {String(number).padStart(2, "0")}
                    </span>
                    <Icon
                      aria-hidden
                      className="mt-0.5 size-4 shrink-0 text-primary"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">
                        {part.name}{" "}
                        <span className="font-normal text-muted-foreground">
                          ({part.english})
                        </span>
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {part.question}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function PathSyllabus({ path }: { path: PublicPath }) {
  return (
    <section aria-labelledby="de-cuong" className="scroll-mt-24">
      <SectionHeading
        id="de-cuong"
        kicker="Đề cương"
        title="Nội dung lộ trình"
        description={`${path.total} bài học · ${path.exercises} bài tập. Bấm vào từng bài để xem các phần bên trong.`}
      />
      {path.rooms.length === 0 ? (
        <p className="rounded-3xl border-2 border-dashed border-primary/30 p-8 text-center text-muted-foreground">
          Giảng viên đang soạn nội dung cho lộ trình này.
        </p>
      ) : (
        <ol className="space-y-3">
          {path.rooms.map((room, index) => (
            <li key={room.id}>
              <details
                open={index === 0}
                className="group/lesson rounded-2xl border-2 border-primary bg-background open:shadow-[4px_4px_0_0_var(--brand-blue)]"
              >
                <summary className="flex cursor-pointer list-none items-center gap-4 p-4 sm:p-5 [&::-webkit-details-marker]:hidden">
                  <span
                    className={cn(
                      "grid size-11 shrink-0 place-items-center rounded-xl border-2 border-primary text-sm font-bold",
                      room.completed
                        ? "bg-primary text-primary-foreground"
                        : "bg-brand-sky-light/60 text-primary",
                    )}
                  >
                    {room.completed ? (
                      <Check aria-hidden className="size-5" strokeWidth={3} />
                    ) : (
                      String(index + 1).padStart(2, "0")
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold break-words">
                      {room.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {LESSON_PART_COUNT} phần
                      {room.exercises > 0 && ` · ${room.exercises} bài tập`}
                      {room.completed && " · Đã hoàn thành"}
                    </span>
                  </span>
                  <ChevronDown
                    aria-hidden
                    className="size-5 shrink-0 text-primary transition-transform group-open/lesson:rotate-180"
                  />
                </summary>
                <div className="border-t-2 border-dashed border-primary/20 px-4 pt-4 pb-5 sm:px-5">
                  {room.description && (
                    <p className="mb-4 text-sm text-muted-foreground">
                      {room.description}
                    </p>
                  )}
                  <ol className="space-y-3">
                    {LESSON_PHASES.map((phase) => (
                      <li
                        key={phase.title}
                        className="grid gap-2 sm:grid-cols-[8rem_1fr] sm:items-start"
                      >
                        <span className="text-xs font-bold tracking-wide text-muted-foreground uppercase sm:pt-1.5">
                          {phase.title}
                        </span>
                        <ul className="flex flex-wrap gap-2">
                          {phase.parts.map((part) => (
                            <li
                              key={part.name}
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
                                part.english === "Practice"
                                  ? "border-accent/40 bg-accent/10 text-accent-strong"
                                  : "border-primary/20 bg-background",
                              )}
                            >
                              <part.icon aria-hidden className="size-3.5" />
                              {part.name}
                              {part.english === "Practice" &&
                                room.exercises > 0 &&
                                ` · ${room.exercises} bài`}
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ol>
                </div>
              </details>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function PathAuthor({ path }: { path: PublicPath }) {
  const posted = formatPostedAt(path.publishedAt);
  return (
    <section aria-labelledby="author-title">
      <SectionHeading
        id="author-title"
        kicker="Giảng viên"
        title="Người biên soạn"
      />
      <div className="flex flex-wrap items-center gap-4 rounded-3xl border-2 border-primary bg-background p-6">
        <span
          aria-hidden
          className="grid size-14 shrink-0 place-items-center rounded-full border-2 border-primary bg-brand-sky-light text-xl font-bold text-primary"
        >
          {path.author.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="text-lg font-bold break-words">{path.author.name}</p>
          {path.author.school && (
            <p className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin aria-hidden className="size-4" />
              {path.author.school.name}, {path.author.school.province}
            </p>
          )}
          {posted && (
            <p className="text-sm text-muted-foreground">
              Xuất bản {posted.toLowerCase()}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/** Thẻ tóm tắt dính bên phải trên màn hình lớn, luôn có nút bắt đầu trong tầm mắt. */
export function PathSummaryCard({ path }: { path: PublicPath }) {
  const duration = formatDuration(path.estimatedMinutes);
  const rows: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: Gauge, label: "Độ khó", value: DIFFICULTY_LABELS[path.difficulty] },
    { icon: BookOpen, label: "Bài học", value: `${path.total} bài` },
    { icon: Code, label: "Bài tập", value: `${path.exercises} bài` },
    ...(duration
      ? [{ icon: Clock, label: "Thời lượng", value: duration }]
      : []),
    { icon: Layers, label: "Mỗi bài", value: `${LESSON_PART_COUNT} phần` },
  ];
  return (
    <aside className="rounded-3xl border-2 border-primary bg-background p-6 shadow-[6px_6px_0_0_var(--brand-blue)] lg:sticky lg:top-24">
      <p className="text-sm font-bold">Lộ trình gồm</p>
      <dl className="mt-4 space-y-3 text-sm">
        {rows.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <dt className="inline-flex items-center gap-2 text-muted-foreground">
              <Icon aria-hidden className="size-4 text-primary" />
              {label}
            </dt>
            <dd className="font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      {path.enrolled && (
        <div className="mt-5 rounded-2xl bg-brand-sky-light/50 p-3">
          <p className="flex justify-between text-xs font-semibold">
            <span>Tiến độ của bạn</span>
            <span>{path.percent}%</span>
          </p>
          <span className="mt-2 block h-2.5 overflow-hidden rounded-full bg-background">
            <span
              className="block h-full rounded-full bg-primary"
              style={{ width: `${path.percent}%` }}
            />
          </span>
        </div>
      )}
      <Button asChild size="lg" className="mt-6 w-full rounded-full">
        <Link href={startHref(path)}>
          {path.enrolled ? "Tiếp tục học" : "Bắt đầu học miễn phí"}
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      </Button>
      {!path.enrolled && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Cần đăng nhập để lưu tiến độ học.
        </p>
      )}
    </aside>
  );
}
