import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CodeXml,
  Clock,
  Layers,
  MapPin,
  GraduationCap,
  Search,
  Users,
} from "lucide-react";
import type { Difficulty } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DIFFICULTY_LABELS } from "../cover-themes";
import { hasActiveFilters } from "../catalog-filters";
import { formatDuration, formatPostedAt } from "../format";
import type { CatalogFilters } from "../repository";
import type { getPaths } from "../service";

type PathCard = Awaited<ReturnType<typeof getPaths>>[number];

const DIFFICULTY_TONES: Record<Difficulty, string> = {
  EASY: "border-success/40 bg-success/10 text-success",
  MEDIUM: "border-brand-sky/50 bg-secondary/50 text-primary",
  HARD: "border-accent/40 bg-accent/10 text-accent-strong",
};

/** Màu mảng trang trí xoay vòng theo thẻ để lưới không bị một màu. */
const BLOB_TONES = [
  "bg-brand-sky-light",
  "bg-brand-orange/25",
  "bg-brand-sky/35",
  "bg-brand-blue/15",
];

/** Hình minh họa đoán từ tên và chủ đề, để mỗi thẻ có hình riêng mà không cần upload ảnh. */
const ART_RULES: [RegExp, string][] = [
  [/c\+\+|cpp/, "🖥️"],
  [/web|html|css/, "🌐"],
  [/typescript|javascript/, "📘"],
  [/giải thuật|thuật toán|cấu trúc dữ liệu|algorithm/, "🧩"],
  [/sql|database|cơ sở dữ liệu/, "🗄️"],
  [/python/, "🐍"],
  [/nhập môn|cơ bản/, "🚀"],
];

export function pathArt(path: Pick<PathCard, "title" | "tags">) {
  const text = `${path.title} ${path.tags.join(" ")}`.toLowerCase();
  return ART_RULES.find(([pattern]) => pattern.test(text))?.[1] ?? "💻";
}

const pathHref = (path: PathCard) => `/lo-trinh/${path.slug}`;

function catalogHref(
  basePath: string,
  filters: CatalogFilters,
  change: Partial<CatalogFilters>,
) {
  const next = { ...filters, ...change };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.difficulty) params.set("difficulty", next.difficulty);
  if (next.tag) params.set("tag", next.tag);
  if (next.sort === "popular") params.set("sort", "popular");
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

/** Hình minh họa nổi: emoji lớn trên ô nghiêng có bóng. */
export function PathArt({
  path,
  size = "md",
}: {
  path: Pick<PathCard, "title" | "tags">;
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
        {pathArt(path)}
      </span>
    </span>
  );
}

export function DifficultyChip({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span
      className={cn(
        "rounded-md border px-2 py-0.5 text-xs font-semibold",
        DIFFICULTY_TONES[difficulty],
      )}
    >
      {DIFFICULTY_LABELS[difficulty]}
    </span>
  );
}

/** Điểm mạnh giới thiệu chung, không phải số liệu: trang này để quảng bá lộ trình. */
const HIGHLIGHTS = [
  {
    title: "Từ cơ bản đến nâng cao",
    note: "Học theo lộ trình rõ ràng",
    icon: Layers,
    tone: "bg-brand-sky-light/60 text-primary",
  },
  {
    title: "Chấm bài tự động",
    note: "Biết kết quả ngay lập tức",
    icon: CodeXml,
    tone: "bg-brand-orange/15 text-accent-strong",
  },
  {
    title: "Giảng viên biên soạn",
    note: "Nội dung chọn lọc, sát thực tế",
    icon: GraduationCap,
    tone: "bg-brand-sky/20 text-primary",
  },
];

export function PathShowcaseHero() {
  return (
    <section className="space-y-8">
      <div>
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border-2 border-primary bg-brand-sky-light px-3 py-1 text-xs font-bold text-primary">
          Học miễn phí, theo nhịp của bạn
        </p>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Khám phá{" "}
          <span className="relative inline-block text-primary">
            lộ trình
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-1 -z-10 h-3 rounded-full bg-brand-sky-light"
            />
          </span>
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Lộ trình do giảng viên chia sẻ, từ cơ bản đến nâng cao. Chọn một lộ
          trình và bắt đầu chinh phục.
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-3">
        {HIGHLIGHTS.map(({ title, note, icon: Icon, tone }) => (
          <li
            key={title}
            className={cn(
              "flex items-center gap-3 rounded-2xl border-2 border-primary px-4 py-3",
              tone,
            )}
          >
            <Icon aria-hidden className="size-7 shrink-0" />
            <span>
              <span className="block text-sm font-bold text-foreground">
                {title}
              </span>
              <span className="text-xs text-foreground/70">{note}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Hàng nổi bật: thẻ lộ trình đông học viên nhất và thẻ nghiêng "đang hot". */
export function PathSpotlight({ paths }: { paths: PathCard[] }) {
  if (paths.length === 0) return null;
  const ranked = [...paths].sort((a, b) => b.learners - a.learners);
  const featured = ranked[0];
  const hot = ranked.slice(0, 4);
  const maxLearners = Math.max(1, ...hot.map((path) => path.learners));
  const duration = formatDuration(featured.estimatedMinutes);
  return (
    <section
      aria-label="Nổi bật"
      className="mt-10 grid gap-6 lg:grid-cols-[1.45fr_1fr] lg:items-center"
    >
      <article className="group relative overflow-hidden rounded-[2rem] border-2 border-primary bg-background p-6 shadow-[6px_6px_0_0_var(--brand-blue)] sm:p-8">
        <span
          aria-hidden
          className="absolute -top-10 -left-10 h-[130%] w-[42%] rounded-r-[45%] bg-brand-sky-light"
        />
        <div className="relative grid items-center gap-6 sm:grid-cols-[auto_1fr]">
          <div className="justify-self-center sm:px-4">
            <PathArt path={featured} size="lg" />
          </div>
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-bold text-accent-foreground">
              Nổi bật tuần này
            </p>
            <h2 className="mt-3 text-2xl leading-tight font-bold break-words sm:text-3xl">
              {featured.title}
            </h2>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {featured.description}
            </p>
            <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <DifficultyChip difficulty={featured.difficulty} />
              <span>• {featured.total} bài học</span>
              {duration && <span>• {duration}</span>}
              <span>• {featured.learners} học viên</span>
            </p>
            <Button asChild className="mt-5 rounded-full px-6">
              <Link href={pathHref(featured)}>
                Bắt đầu học <ArrowRight aria-hidden className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </article>

      <article className="relative rotate-[2.5deg] rounded-[2rem] border-2 border-primary bg-background p-6 shadow-[6px_6px_0_0_var(--brand-blue)] transition-transform hover:rotate-0">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl leading-tight font-bold">
            Đang được học
            <br />
            nhiều nhất
          </h2>
          <p className="text-right">
            <span className="block text-3xl leading-none font-bold text-primary">
              {hot.reduce((sum, path) => sum + path.learners, 0)}
            </span>
            <span className="text-xs text-muted-foreground">lượt tham gia</span>
          </p>
        </div>
        <ul className="mt-5 space-y-4">
          {hot.map((path) => (
            <li
              key={path.id}
              className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5"
            >
              <Link
                href={pathHref(path)}
                className="truncate text-sm font-semibold hover:underline"
              >
                {path.title}
              </Link>
              <span className="text-xs text-muted-foreground">
                {path.learners} học viên
              </span>
              <span className="col-span-2 h-3 overflow-hidden rounded-full border border-primary/40 bg-muted">
                <span
                  className="block h-full rounded-full bg-[repeating-linear-gradient(135deg,var(--brand-sky)_0_6px,#5ccbff_6px_12px)]"
                  style={{
                    width: `${Math.max(8, (path.learners / maxLearners) * 100)}%`,
                  }}
                />
              </span>
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}

/** Lọc bằng link và form GET thuần nên chia sẻ link được, không cần JavaScript. */
export function PathShowcaseFilters({
  filters,
  tags,
  basePath,
}: {
  filters: CatalogFilters;
  tags: string[];
  basePath: string;
}) {
  const tabs: { value?: Difficulty; label: string }[] = [
    { label: "Tất cả" },
    ...(Object.entries(DIFFICULTY_LABELS) as [Difficulty, string][]).map(
      ([value, label]) => ({ value, label }),
    ),
  ];
  return (
    <section aria-label="Tìm và lọc lộ trình" className="mt-12 space-y-5">
      <form
        method="get"
        action={basePath}
        className="flex flex-wrap items-center gap-2 rounded-3xl border-2 border-primary bg-background p-1.5 pl-5 sm:rounded-full"
      >
        {filters.tag && <input type="hidden" name="tag" value={filters.tag} />}
        {filters.difficulty && (
          <input type="hidden" name="difficulty" value={filters.difficulty} />
        )}
        <Search aria-hidden className="size-4 text-muted-foreground" />
        <label htmlFor="showcase-q" className="sr-only">
          Tìm lộ trình
        </label>
        <input
          id="showcase-q"
          name="q"
          type="search"
          maxLength={100}
          defaultValue={filters.q}
          placeholder="Tìm theo tên, chủ đề hoặc giảng viên"
          className="h-10 min-w-40 flex-1 bg-transparent text-sm outline-none"
        />
        <label htmlFor="showcase-sort" className="sr-only">
          Sắp xếp
        </label>
        <select
          id="showcase-sort"
          name="sort"
          defaultValue={filters.sort}
          className="h-10 rounded-full bg-muted px-3 text-sm font-medium"
        >
          <option value="newest">Mới nhất</option>
          <option value="popular">Nhiều học viên nhất</option>
        </select>
        <Button type="submit" className="h-10 rounded-full px-5">
          Tìm
        </Button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Dành cho bạn</h2>
        <nav aria-label="Lọc theo độ khó">
          <ul className="flex gap-0.5 rounded-full border-2 border-primary bg-background p-1 text-xs sm:gap-1 sm:text-sm">
            {tabs.map((tab) => {
              const active = filters.difficulty === tab.value;
              return (
                <li key={tab.label}>
                  <Link
                    href={catalogHref(basePath, filters, {
                      difficulty: tab.value,
                    })}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-block rounded-full px-2.5 py-1.5 font-semibold whitespace-nowrap transition-colors sm:px-3 focus-visible:outline-2 focus-visible:outline-ring",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {tab.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {(tags.length > 0 || hasActiveFilters(filters)) && (
        <ul
          className="flex flex-wrap items-center gap-2"
          aria-label="Lọc theo chủ đề"
        >
          {tags.map((tag) => {
            const active = filters.tag === tag;
            return (
              <li key={tag}>
                <Link
                  href={catalogHref(basePath, filters, {
                    tag: active ? undefined : tag,
                  })}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "inline-block rounded-full border-2 px-3 py-1 text-xs font-semibold transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-ring",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-primary/20 bg-background hover:border-primary",
                  )}
                >
                  #{tag}
                </Link>
              </li>
            );
          })}
          {hasActiveFilters(filters) && (
            <li>
              <Link
                href={basePath}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Xóa bộ lọc
              </Link>
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

export function PathShowcaseGrid({
  paths,
  filtered,
}: {
  paths: PathCard[];
  filtered: boolean;
}) {
  if (paths.length === 0)
    return (
      <p className="mt-8 rounded-3xl border-2 border-dashed border-primary/30 bg-background p-10 text-center text-muted-foreground">
        {filtered
          ? "Không có lộ trình nào phù hợp với bộ lọc."
          : "Chưa có lộ trình được xuất bản."}
      </p>
    );
  return (
    <ul className="mt-6 grid gap-5 lg:grid-cols-2">
      {paths.map((path, index) => (
        <PathShowcaseCard
          key={path.id}
          path={path}
          tone={BLOB_TONES[index % BLOB_TONES.length]}
        />
      ))}
    </ul>
  );
}

function PathShowcaseCard({ path, tone }: { path: PathCard; tone: string }) {
  const duration = formatDuration(path.estimatedMinutes);
  const posted = formatPostedAt(path.publishedAt);
  return (
    <li className="group relative flex min-h-52 overflow-hidden rounded-3xl border-2 border-primary bg-background transition-all duration-200 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_var(--brand-blue)]">
      <span
        aria-hidden
        className={cn(
          "absolute right-0 bottom-0 h-[88%] w-[36%] rounded-tl-[70%_85%] transition-all duration-300 group-hover:h-full group-hover:w-[40%]",
          tone,
        )}
      />
      <div className="absolute top-1/2 right-[6%] -translate-y-1/2">
        <PathArt path={path} />
      </div>

      <div className="relative flex w-[64%] min-w-0 flex-col gap-2 p-5 sm:p-6">
        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Layers aria-hidden className="size-3.5 text-primary" />
          Lộ trình
          {path.tags[0] && (
            <span className="text-primary">· #{path.tags[0]}</span>
          )}
        </p>
        <h3 className="text-xl leading-snug font-bold break-words">
          <Link
            href={pathHref(path)}
            className="rounded after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-ring"
          >
            {path.title}
          </Link>
        </h3>
        <p className="line-clamp-2 text-sm text-muted-foreground break-words">
          {path.description}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <DifficultyChip difficulty={path.difficulty} />
          <span className="inline-flex items-center gap-1">
            <BookOpen aria-hidden className="size-3.5" />
            {path.total} bài học · {path.exercises} bài tập
          </span>
          {duration && (
            <span className="inline-flex items-center gap-1">
              <Clock aria-hidden className="size-3.5" />
              {duration}
            </span>
          )}
        </p>

        <div className="mt-auto flex items-center gap-2.5 pt-3 text-xs">
          <span
            aria-hidden
            className="grid size-8 shrink-0 place-items-center rounded-full border-2 border-primary bg-brand-sky-light text-sm font-bold"
          >
            {path.author.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{path.author.name}</p>
            <p className="flex flex-wrap items-center gap-x-2 text-muted-foreground">
              {path.author.school && (
                <span className="inline-flex items-center gap-1">
                  <MapPin aria-hidden className="size-3" />
                  {path.author.school.name}
                </span>
              )}
              {posted && <span>{posted}</span>}
              <span className="inline-flex items-center gap-1">
                <Users aria-hidden className="size-3" />
                {path.learners > 0 ? `${path.learners} học viên` : "Mới"}
              </span>
            </p>
          </div>
        </div>
      </div>

      <span
        aria-hidden
        className="absolute right-4 bottom-4 grid size-9 place-items-center rounded-full border-2 border-primary bg-background transition-transform duration-300 group-hover:rotate-45"
      >
        <ArrowUpRight className="size-4" />
      </span>
    </li>
  );
}
