import Link from "next/link";
import {
  CheckCircle2,
  FileText,
  FileType,
  FolderOpen,
  Globe,
  MonitorPlay,
  Pencil,
  Presentation,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExerciseItem } from "@/features/exercises/components/exercise-item";
import { ExercisePreview } from "@/features/exercises/components/exercise-preview";
import { CategorySidebar } from "@/features/library/components/category-sidebar";
import {
  ItemActions,
  SaveToMine,
} from "@/features/library/components/item-actions";
import { LecturePreview } from "@/features/library/components/lecture-preview";
import { LibraryAddMenu } from "@/features/library/components/library-add-menu";
import { STATUS_LABELS } from "@/features/library/labels";
import { getLibrary, type LibraryKind } from "@/features/library/service";
import { formatDateTime } from "@/features/paths/format";
import { formatFileSize } from "@/features/rooms/attachment-rules";
import { cn } from "@/lib/utils";

export const metadata = { title: "Kho tài liệu · Code Carf" };

type Query = Record<string, string | undefined>;

const KIND_LABEL: Record<LibraryKind, string> = {
  CODE: "Code",
  QUIZ: "Trắc nghiệm",
  HANDWRITTEN: "Tự luận",
};
const LECTURE_LABEL = {
  VIDEO: "Video",
  PDF: "PDF",
  SLIDE: "Slide",
  DOC: "Word",
} as const;
const LECTURE_ICON = {
  VIDEO: MonitorPlay,
  PDF: FileText,
  SLIDE: Presentation,
  DOC: FileType,
} as const;
const DIFFICULTY_LABEL = { EASY: "Dễ", MEDIUM: "Trung bình", HARD: "Khó" };

function UsedIn({ rooms }: { rooms: string[] }) {
  if (rooms.length === 0)
    return <span className="text-muted-foreground">Chưa dùng</span>;
  return (
    <span title={rooms.join(", ")}>
      Dùng trong <strong className="text-foreground">{rooms.length}</strong> bài
      học
    </span>
  );
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "rounded-full border-2 px-3 py-1 text-xs font-semibold whitespace-nowrap",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-primary/15 text-primary hover:border-primary/40",
      )}
    >
      {children}
    </Link>
  );
}

/** Nhãn nhỏ: danh mục, trạng thái khác "Sẵn sàng", chia sẻ, thẻ. */
function MetaBadges({
  category,
  status,
  shared,
  tags,
  owner,
}: {
  category?: string | null;
  status?: keyof typeof STATUS_LABELS;
  shared?: boolean;
  tags: string[];
  owner?: string;
}) {
  return (
    <>
      {owner && <span>của {owner}</span>}
      {category && (
        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 font-medium text-foreground">
          <FolderOpen className="size-3" aria-hidden />
          {category}
        </span>
      )}
      {status && status !== "READY" && (
        <span
          className={cn(
            "rounded-md px-1.5 py-0.5 font-semibold",
            status === "DRAFT"
              ? "bg-warning/10 text-warning"
              : "bg-muted text-muted-foreground",
          )}
        >
          {STATUS_LABELS[status]}
        </span>
      )}
      {shared && (
        <span className="inline-flex items-center gap-1 font-semibold text-primary">
          <Globe className="size-3" aria-hidden />
          Đang chia sẻ
        </span>
      )}
      {tags.map((tag) => (
        <span key={tag} className="text-primary">
          #{tag}
        </span>
      ))}
    </>
  );
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const query = await searchParams;
  const tab = query.tab === "bai-giang" ? "lectures" : "exercises";
  const library = await getLibrary({
    scope: query.pham_vi,
    q: query.q,
    kind: query.loai,
    lecture: query.loaiBaiGiang,
    category: query.danhMuc,
    status: query.trangThai,
    difficulty: query.doKho,
    tag: query.the,
  });
  const shared = library.shared;
  const href = (change: Query) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...query, ...change }))
      if (value && key !== "saved") params.set(key, value);
    const text = params.toString();
    return text ? `/gv/library?${text}` : "/gv/library";
  };
  const exerciseTotal = Object.values(library.exerciseCounts).reduce(
    (sum, count) => sum + (count ?? 0),
    0,
  );
  const lectureTotal = Object.values(library.lectureCounts).reduce(
    (sum, count) => sum + (count ?? 0),
    0,
  );
  const categoryOptions = library.categories.map(({ id, name }) => ({
    id,
    name,
  }));
  const filtered = Boolean(
    query.q || query.loai || query.loaiBaiGiang || query.the || query.doKho,
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold tracking-wide text-primary uppercase">
            Quản lý nội dung
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Kho tài liệu
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Bài tập và bài giảng của bạn, xếp theo danh mục. Khi soạn bài học,
            chọn &quot;Thêm nội dung&quot; → &quot;Chọn từ kho&quot; để dùng
            lại. Mỗi lần dùng là một bản sao, sửa trong kho không làm đổi bài
            đang dạy.
          </p>
        </div>
        {!shared && <LibraryAddMenu categoryId={query.danhMuc} />}
      </header>

      {query.saved === "1" && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-success/25 bg-success/10 px-4 py-3 text-sm font-medium text-success"
        >
          <CheckCircle2 className="size-4" aria-hidden />
          Đã lưu bài tập vào kho.
        </p>
      )}

      <nav
        aria-label="Phạm vi kho"
        className="inline-flex rounded-xl bg-muted/60 p-1"
      >
        {(
          [
            [undefined, "Kho của tôi"],
            ["chia-se", "Giảng viên khác chia sẻ"],
          ] as const
        ).map(([value, label]) => {
          const active = query.pham_vi === value;
          return (
            <Link
              key={label}
              href={href({
                pham_vi: value,
                danhMuc: undefined,
                trangThai: undefined,
                the: undefined,
              })}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-lg px-4 py-1.5 text-sm font-semibold",
                active
                  ? "bg-background text-primary shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        {!shared ? (
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <CategorySidebar
              active={query.danhMuc}
              allHref={href({ danhMuc: undefined })}
              categories={library.categories.map((category) => ({
                ...category,
                href: href({ danhMuc: category.id }),
              }))}
            />
            {library.tags.length > 0 && (
              <div className="space-y-2 px-3">
                <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                  Thẻ hay dùng
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {library.tags.map((tag) => (
                    <Link
                      key={tag}
                      href={href({ the: query.the === tag ? undefined : tag })}
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        query.the === tag
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground hover:bg-secondary",
                      )}
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
        ) : (
          <aside className="rounded-2xl bg-secondary/30 p-4 text-sm text-muted-foreground lg:self-start">
            Đây là bài tập và bài giảng giảng viên khác chia sẻ. Bấm &quot;Lưu
            về kho của tôi&quot; để có bản riêng chỉnh sửa, hoặc chọn thẳng khi
            soạn bài học.
          </aside>
        )}

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b">
            <nav aria-label="Loại tài liệu" className="flex gap-1">
              {(
                [
                  ["exercises", "Bài tập", exerciseTotal, undefined],
                  ["lectures", "Bài giảng", lectureTotal, "bai-giang"],
                ] as const
              ).map(([key, label, count, value]) => (
                <Link
                  key={key}
                  href={href({
                    tab: value,
                    loai: undefined,
                    loaiBaiGiang: undefined,
                    doKho: undefined,
                  })}
                  aria-current={tab === key ? "page" : undefined}
                  className={cn(
                    "-mb-px border-b-2 px-3 py-2.5 text-sm font-semibold",
                    tab === key
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    {count}
                  </span>
                </Link>
              ))}
            </nav>
            <form action="/gv/library" className="relative mb-2 w-full sm:w-64">
              {Object.entries(query)
                .filter(
                  ([key, value]) => key !== "q" && key !== "saved" && value,
                )
                .map(([key, value]) => (
                  <input key={key} type="hidden" name={key} value={value} />
                ))}
              <label htmlFor="library-search" className="sr-only">
                Tìm trong kho
              </label>
              <Search
                aria-hidden
                className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <input
                id="library-search"
                name="q"
                type="search"
                defaultValue={query.q}
                placeholder="Tìm theo tên..."
                className="h-10 w-full rounded-full border-2 border-input bg-background pr-3 pl-9 text-sm focus-visible:border-primary focus-visible:outline-none"
              />
            </form>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {tab === "exercises" ? (
              <>
                <Chip href={href({ loai: undefined })} active={!query.loai}>
                  Tất cả · {exerciseTotal}
                </Chip>
                {(Object.keys(KIND_LABEL) as LibraryKind[]).map((kind) => (
                  <Chip
                    key={kind}
                    href={href({ loai: kind })}
                    active={query.loai === kind}
                  >
                    {KIND_LABEL[kind]} · {library.exerciseCounts[kind] ?? 0}
                  </Chip>
                ))}
                <span className="mx-1 h-5 w-px bg-border" aria-hidden />
                {(["EASY", "MEDIUM", "HARD"] as const).map((level) => (
                  <Chip
                    key={level}
                    href={href({
                      doKho: query.doKho === level ? undefined : level,
                    })}
                    active={query.doKho === level}
                  >
                    {DIFFICULTY_LABEL[level]}
                  </Chip>
                ))}
              </>
            ) : (
              <>
                <Chip
                  href={href({ loaiBaiGiang: undefined })}
                  active={!query.loaiBaiGiang}
                >
                  Tất cả · {lectureTotal}
                </Chip>
                {(
                  Object.keys(LECTURE_LABEL) as (keyof typeof LECTURE_LABEL)[]
                ).map((kind) => (
                  <Chip
                    key={kind}
                    href={href({ loaiBaiGiang: kind })}
                    active={query.loaiBaiGiang === kind}
                  >
                    {LECTURE_LABEL[kind]} · {library.lectureCounts[kind] ?? 0}
                  </Chip>
                ))}
              </>
            )}
            {!shared && (
              <>
                <span className="mx-1 h-5 w-px bg-border" aria-hidden />
                {(["DRAFT", "ARCHIVED"] as const).map((status) => (
                  <Chip
                    key={status}
                    href={href({
                      trangThai:
                        query.trangThai === status ? undefined : status,
                    })}
                    active={query.trangThai === status}
                  >
                    {STATUS_LABELS[status]}
                  </Chip>
                ))}
              </>
            )}
          </div>

          {tab === "exercises" ? (
            library.exercises.length === 0 ? (
              <Empty
                text={
                  shared
                    ? "Chưa có bài tập nào được chia sẻ."
                    : filtered || query.danhMuc || query.trangThai
                      ? "Không có bài tập phù hợp."
                      : "Kho chưa có bài tập nào."
                }
                hint={
                  shared
                    ? "Giảng viên chia sẻ bài ở trạng thái Sẵn sàng thì bài hiện ở đây."
                    : "Bài tập tạo trong bài học cũng tự được lưu vào đây."
                }
              />
            ) : (
              <ul className="space-y-3">
                {library.exercises.map((exercise) => {
                  const meta = {
                    categoryId: exercise.libraryCategory?.id ?? null,
                    tags: exercise.libraryTags,
                    status: exercise.libraryStatus,
                    visibility: exercise.libraryVisibility,
                  };
                  return (
                    <ExerciseItem
                      key={exercise.id}
                      summary={
                        <>
                          <p className="font-semibold break-words">
                            {exercise.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground tabular-nums">
                            <span className="rounded-full border border-primary/20 px-2 py-0.5 font-semibold text-primary">
                              {KIND_LABEL[exercise.kind]}
                            </span>
                            <span>{DIFFICULTY_LABEL[exercise.difficulty]}</span>
                            <span>·</span>
                            <span>
                              {exercise.kind === "QUIZ"
                                ? `${exercise.quizQuestions.length} câu hỏi`
                                : exercise.kind === "CODE"
                                  ? `${exercise.testCases.length} test case`
                                  : "Nộp ảnh bài làm"}
                            </span>
                            <span>·</span>
                            {shared ? (
                              <MetaBadges
                                owner={exercise.creator?.name}
                                tags={exercise.libraryTags}
                              />
                            ) : (
                              <>
                                <UsedIn rooms={exercise.usedIn} />
                                <MetaBadges
                                  category={exercise.libraryCategory?.name}
                                  status={exercise.libraryStatus}
                                  shared={
                                    exercise.libraryVisibility === "SHARED"
                                  }
                                  tags={exercise.libraryTags}
                                />
                              </>
                            )}
                          </div>
                        </>
                      }
                      actions={
                        shared ? (
                          <SaveToMine exerciseId={exercise.id} />
                        ) : (
                          <>
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="rounded-lg"
                            >
                              <Link
                                href={`/gv/library/exercises/${exercise.id}/edit`}
                              >
                                <Pencil className="size-3.5" aria-hidden />
                                Sửa
                              </Link>
                            </Button>
                            <ItemActions
                              target="exercise"
                              id={exercise.id}
                              name={exercise.title}
                              meta={meta}
                              categories={categoryOptions}
                            />
                          </>
                        )
                      }
                      preview={<ExercisePreview exercise={exercise} />}
                    />
                  );
                })}
              </ul>
            )
          ) : library.lectures.length === 0 ? (
            <Empty
              text={
                shared
                  ? "Chưa có bài giảng nào được chia sẻ."
                  : filtered || query.danhMuc || query.trangThai
                    ? "Không có bài giảng phù hợp."
                    : "Kho chưa có bài giảng nào."
              }
              hint={
                shared
                  ? "Bài giảng được chia sẻ ở trạng thái Sẵn sàng sẽ hiện ở đây."
                  : 'Bấm "Thêm tài liệu" để tải PDF, slide, Word hoặc thêm video YouTube.'
              }
            />
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {library.lectures.map((lecture) => {
                const Icon = LECTURE_ICON[lecture.kind];
                return (
                  <li
                    key={lecture.id}
                    className="flex flex-col overflow-hidden rounded-2xl border-2 border-primary/15 bg-background transition-colors hover:border-primary/40"
                  >
                    <div className="relative grid aspect-video place-items-center bg-secondary/30">
                      {lecture.kind === "VIDEO" && lecture.youtubeId ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`https://i.ytimg.com/vi/${lecture.youtubeId}/mqdefault.jpg`}
                          alt=""
                          loading="lazy"
                          className="size-full object-cover"
                        />
                      ) : (
                        <Icon
                          aria-hidden
                          className="size-12 text-primary/60"
                          strokeWidth={1.5}
                        />
                      )}
                      <span className="absolute top-2 left-2 rounded-md bg-background/95 px-2 py-0.5 text-[11px] font-bold text-primary shadow-xs">
                        {LECTURE_LABEL[lecture.kind]}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col gap-1.5 p-4">
                      <p className="line-clamp-2 font-semibold break-words">
                        {lecture.title}
                      </p>
                      <p className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        {lecture.size ? (
                          <span>{formatFileSize(lecture.size)}</span>
                        ) : null}
                        <span>{formatDateTime(lecture.createdAt)}</span>
                      </p>
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        {shared ? (
                          <MetaBadges
                            owner={lecture.owner.name}
                            tags={lecture.tags}
                          />
                        ) : (
                          <>
                            <UsedIn rooms={lecture.usedIn} />
                            <MetaBadges
                              category={lecture.category?.name}
                              status={lecture.status}
                              shared={lecture.visibility === "SHARED"}
                              tags={lecture.tags}
                            />
                          </>
                        )}
                      </p>
                      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                        <LecturePreview lecture={lecture} />
                        {shared ? (
                          <SaveToMine lectureId={lecture.id} />
                        ) : (
                          <ItemActions
                            target="lecture"
                            id={lecture.id}
                            name={lecture.title}
                            meta={{
                              categoryId: lecture.category?.id ?? null,
                              tags: lecture.tags,
                              status: lecture.status,
                              visibility: lecture.visibility,
                            }}
                            categories={categoryOptions}
                          />
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Empty({ text, hint }: { text: string; hint: string }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-primary/25 p-10 text-center">
      <FolderOpen className="mx-auto size-10 text-primary/50" aria-hidden />
      <p className="mt-3 font-semibold">{text}</p>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
    </div>
  );
}
