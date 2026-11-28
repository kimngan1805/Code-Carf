import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  CodeXml,
  Pencil,
  Plus,
  Settings2,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeletePathButton } from "@/features/paths/components/delete-path-button";
import { EnrolledStudentsSection } from "@/features/paths/components/enrolled-students-section";
import { ManagedPathRoomItem } from "@/features/paths/components/managed-path-room-item";
import {
  PathBreadcrumb,
  PathDifficultyBadge,
  PathStatusBadge,
} from "@/features/paths/components/path-badges";
import { PathPublication } from "@/features/paths/components/path-publication";
import { PathUnlockSetting } from "@/features/paths/components/path-unlock-setting";
import { coverThemeClass } from "@/features/paths/cover-themes";
import { getManagedPathEnrolledStudents } from "@/features/paths/enrolled-students";
import { formatDateTime, formatDuration } from "@/features/paths/format";
import { getManagedPath } from "@/features/paths/management";
import { AppError } from "@/lib/errors";
import { cn } from "@/lib/utils";

export default async function ManagedPathPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    created?: string;
    saved?: string;
    studentsPage?: string | string[];
  }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const created = query.created === "1";
  const saved = query.saved === "1";

  const path = await getManagedPath(slug).catch((error) => {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  });

  const enrolledStudents = await getManagedPathEnrolledStudents(slug, {
    page: query.studentsPage,
  }).catch((error) => {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  });

  const totalExercises = path.rooms.reduce(
    (sum, room) => sum + room._count.exercises,
    0,
  );
  const roomsWithoutExercises = path.rooms.filter(
    (room) => room._count.exercises === 0,
  ).length;
  // Bài chưa có nội dung, tài liệu hay bài tập thì chưa xuất bản được (backend kiểm tra lại).
  const emptyLessons = path.rooms.filter((room) => !room.hasMaterial).length;
  const durationLabel = formatDuration(path.estimatedMinutes);
  const timestampLabel = path.published
    ? formatDateTime(path.publishedAt)
    : formatDateTime(path.createdAt);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PathBreadcrumb
        items={[
          { label: "Quản lý lộ trình", href: "/gv/paths" },
          { label: path.title },
        ]}
      />

      {created && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-success/25 bg-success/10 px-4 py-3.5 text-sm font-medium text-success"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            {path.rooms.length > 0
              ? `Đã tạo lộ trình cùng ${path.rooms.length} bài học. Bấm "Thêm nội dung" ở từng bài để thêm slide/PDF, video hoặc bài tập.`
              : "Đã tạo lộ trình thành công. Hãy thêm bài học đầu tiên để bắt đầu xây dựng nội dung."}
          </p>
        </div>
      )}

      {saved && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-success/25 bg-success/10 px-4 py-3.5 text-sm font-medium text-success"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>Đã lưu thông tin lộ trình.</p>
        </div>
      )}

      {/* Workspace Header Card */}
      <section className="overflow-hidden rounded-2xl border border-border/70 bg-background">
        {/* Refined Visual Cover Banner */}
        <div
          className={cn(
            "relative flex min-h-28 flex-col justify-between gap-3 overflow-hidden bg-gradient-to-br p-5 sm:min-h-32 sm:p-6",
            coverThemeClass(path.coverTheme),
          )}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -top-10 -right-8 size-44 rounded-full bg-primary-foreground/15"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute right-24 -bottom-14 size-32 rounded-full bg-primary-foreground/10"
          />
          <div className="relative flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <PathStatusBadge published={path.published} surface="elevated" />
              <PathDifficultyBadge
                difficulty={path.difficulty}
                surface="elevated"
              />
            </div>
            {timestampLabel && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-foreground shadow-xs backdrop-blur-xs">
                <Calendar className="size-3.5 text-primary" aria-hidden />
                {path.published ? "Xuất bản lúc" : "Tạo lúc"}{" "}
                <time
                  dateTime={(path.published
                    ? path.publishedAt
                    : path.createdAt
                  )?.toISOString()}
                >
                  {timestampLabel}
                </time>
              </span>
            )}
          </div>
        </div>

        {/* Title, description & primary/secondary actions */}
        <div className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1 space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground break-words sm:text-3xl">
                {path.title}
              </h1>
              {path.description.trim() ? (
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground break-words">
                  {path.description}
                </p>
              ) : (
                <p className="text-sm italic text-muted-foreground/80">
                  Chưa có mô tả cho lộ trình này. Bạn có thể bổ sung để học viên
                  hiểu rõ mục tiêu học tập.
                </p>
              )}
              {path.tags.length > 0 && (
                <ul className="flex flex-wrap gap-2 pt-1" aria-label="Chủ đề">
                  {path.tags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
                    >
                      #{tag}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 lg:shrink-0">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="rounded-xl"
              >
                <Link href={`/gv/paths/${path.slug}/edit`}>
                  <Pencil className="size-3.5" aria-hidden />
                  Chỉnh sửa thông tin
                </Link>
              </Button>
              <Button asChild size="sm" className="rounded-xl">
                <Link href={`/gv/paths/${path.slug}/rooms/new`}>
                  <Plus className="size-4" aria-hidden />
                  Thêm bài học
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Overview KPI Strip */}
        <dl className="grid grid-cols-2 gap-4 border-t border-border/60 bg-muted/25 px-5 py-4 sm:grid-cols-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary/70 text-primary"
            >
              <BookOpen className="size-4" />
            </span>
            <div>
              <dt className="text-xs text-muted-foreground">Bài học</dt>
              <dd className="text-base font-bold text-foreground tabular-nums">
                {path.rooms.length}
              </dd>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="grid size-10 shrink-0 place-items-center rounded-xl bg-highlight/15 text-primary"
            >
              <CodeXml className="size-4" />
            </span>
            <div>
              <dt className="text-xs text-muted-foreground">Bài tập</dt>
              <dd className="text-base font-bold text-foreground tabular-nums">
                {totalExercises}
              </dd>
            </div>
          </div>

          <a
            href="#hoc-vien"
            className="group -m-1.5 flex items-center gap-3 rounded-xl p-1.5 transition-colors hover:bg-muted/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span
              aria-hidden
              className="grid size-10 shrink-0 place-items-center rounded-xl bg-success/15 text-success"
            >
              <Users className="size-4" />
            </span>
            <div>
              <dt className="text-xs text-muted-foreground transition-colors group-hover:text-primary">
                Học viên
              </dt>
              <dd className="text-base font-bold text-foreground tabular-nums">
                {path._count.enrollments}
              </dd>
            </div>
          </a>

          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent-strong"
            >
              <Clock className="size-4" />
            </span>
            <div>
              <dt className="text-xs text-muted-foreground">Thời lượng</dt>
              <dd className="text-base font-bold text-foreground tabular-nums">
                {durationLabel || "Chưa đặt"}
              </dd>
            </div>
          </div>
        </dl>
      </section>

      {/* Main 2-column Content Workspace */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        {/* Left: Readiness + Room Management */}
        <div className="min-w-0 space-y-5">
          {/* Readiness Callout */}
          {!path.published && path.rooms.length === 0 && (
            <div className="flex flex-col gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle
                  aria-hidden
                  className="mt-0.5 size-5 shrink-0 text-warning"
                />
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-foreground">
                    Chưa đủ nội dung để xuất bản
                  </p>
                  <p className="text-xs leading-5 text-muted-foreground">
                    Lộ trình cần ít nhất 1 bài học có nội dung trước khi mở cho
                    học viên đăng ký.
                  </p>
                </div>
              </div>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="shrink-0 rounded-xl border-warning/40 bg-background text-warning hover:bg-warning/10"
              >
                <Link href={`/gv/paths/${path.slug}/rooms/new`}>
                  <Plus className="size-4" aria-hidden />
                  Thêm bài học đầu tiên
                </Link>
              </Button>
            </div>
          )}

          {!path.published && emptyLessons > 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/5 p-4">
              <AlertTriangle
                aria-hidden
                className="mt-0.5 size-5 shrink-0 text-warning"
              />
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-foreground">
                  Còn {emptyLessons} bài học chưa có nội dung
                </p>
                <p className="text-xs leading-5 text-muted-foreground">
                  Mỗi bài chỉ cần một trong ba: nội dung chữ, tài liệu đính kèm
                  (PDF, slide) hoặc bài tập. Bấm &quot;Thêm nội dung&quot; ở bài
                  được đánh dấu để bổ sung.
                </p>
              </div>
            </div>
          )}

          {!path.published && path.rooms.length > 0 && emptyLessons === 0 && (
            <div className="flex items-start gap-3 rounded-2xl border border-success/25 bg-success/5 p-4">
              <Sparkles
                aria-hidden
                className="mt-0.5 size-5 shrink-0 text-success"
              />
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-foreground">
                  Lộ trình đã sẵn sàng xuất bản
                </p>
                <p className="text-xs leading-5 text-muted-foreground">
                  Hiện có {path.rooms.length} bài học và {totalExercises} bài
                  tập.
                  {roomsWithoutExercises > 0
                    ? ` Có ${roomsWithoutExercises} bài học chưa có bài tập thực hành — bạn có thể bổ sung trước hoặc sau khi xuất bản.`
                    : " Tất cả bài học đều đã có bài tập thực hành."}
                </p>
              </div>
            </div>
          )}

          {/* Room Management Section */}
          <section className="rounded-2xl border border-border/70 bg-background p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
              <div className="space-y-0.5">
                <h2 className="text-lg font-bold text-foreground">
                  Nội dung lộ trình
                </h2>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {path.rooms.length} bài học · {totalExercises} bài tập thực
                  hành
                </p>
              </div>
              <Button asChild size="sm" className="rounded-xl">
                <Link href={`/gv/paths/${path.slug}/rooms/new`}>
                  <Plus className="size-4" aria-hidden />
                  Thêm bài học
                </Link>
              </Button>
            </div>

            {path.rooms.length === 0 ? (
              <div className="mt-5 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/25 px-6 py-12 text-center">
                <span
                  aria-hidden
                  className="grid size-12 place-items-center rounded-2xl bg-secondary/70 text-primary"
                >
                  <BookOpen className="size-6" />
                </span>
                <h3 className="mt-3 text-base font-semibold text-foreground">
                  Lộ trình chưa có bài học nào
                </h3>
                <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                  Mỗi bài học gồm phần lý thuyết Markdown và các bài tập code
                  chấm tự động cho học viên.
                </p>
                <Button asChild size="sm" className="mt-5 rounded-xl">
                  <Link href={`/gv/paths/${path.slug}/rooms/new`}>
                    <Plus className="size-4" aria-hidden />
                    Thêm bài học đầu tiên
                  </Link>
                </Button>
              </div>
            ) : (
              <ol className="mt-4 space-y-2.5">
                {path.rooms.map((room) => (
                  <ManagedPathRoomItem
                    key={room.id}
                    pathSlug={path.slug}
                    room={room}
                  />
                ))}
              </ol>
            )}
          </section>

          {/* Enrolled Students Section */}
          <EnrolledStudentsSection
            pathSlug={path.slug}
            pathPublished={path.published}
            data={enrolledStudents}
          />
        </div>

        {/* Right Sticky Settings Sidebar */}
        <aside className="space-y-5 lg:sticky lg:top-24">
          {/* Publishing Card */}
          <section className="rounded-2xl border border-border/70 bg-background p-5">
            <PathPublication
              pathId={path.id}
              published={path.published}
              roomCount={path.rooms.length}
              emptyLessonCount={emptyLessons}
            />
          </section>

          {/* Learning Configuration Card */}
          <section className="space-y-4 rounded-2xl border border-border/70 bg-background p-5">
            <div className="flex items-center gap-2">
              <Settings2 className="size-4 text-primary" aria-hidden />
              <h2 className="text-sm font-semibold text-foreground">
                Cấu hình học tập
              </h2>
            </div>
            <PathUnlockSetting
              pathId={path.id}
              initialEnabled={path.sequentialUnlock}
            />
          </section>

          {/* Danger Zone Card */}
          <section className="space-y-3 rounded-2xl border border-destructive/25 bg-destructive/5 p-5">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-destructive">
                Vùng nguy hiểm
              </h2>
              <p className="text-xs leading-5 text-muted-foreground">
                Xóa mềm sẽ ẩn lộ trình khỏi danh sách quản lý và học viên, đồng
                thời bảo toàn toàn bộ lịch sử học tập, bài nộp, XP và huy hiệu.
              </p>
            </div>
            <DeletePathButton
              pathId={path.id}
              pathTitle={path.title}
              redirectTo="/gv/paths?deleted=1"
              variant="outline"
              className="w-full justify-center rounded-xl"
            />
          </section>
        </aside>
      </div>
    </div>
  );
}
