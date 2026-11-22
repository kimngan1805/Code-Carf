import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, CodeXml, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteExerciseButton } from "@/features/exercises/components/delete-exercise-button";
import { PathBreadcrumb } from "@/features/paths/components/path-badges";
import { getManagedRoom } from "@/features/paths/management";
import { RoomMarkdown } from "@/features/rooms/components/room-markdown";
import { AppError } from "@/lib/errors";
import { cn } from "@/lib/utils";

const difficultyLabel = {
  EASY: "Dễ",
  MEDIUM: "Trung bình",
  HARD: "Khó",
} as const;

const difficultyBadgeClass = {
  EASY: "border-secondary bg-secondary/70 text-secondary-foreground",
  MEDIUM: "border-highlight/30 bg-highlight/15 text-primary",
  HARD: "border-accent/30 bg-accent/15 text-accent-strong",
} as const;

export default async function ManagedRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; roomId: string }>;
  searchParams: Promise<{ saved?: string; exercise?: string }>;
}) {
  const { slug, roomId } = await params;
  const query = await searchParams;
  const saved = query.saved === "1";
  const exerciseSaved = query.exercise === "saved";

  const room = await getManagedRoom(slug, roomId).catch((error) => {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  });

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <PathBreadcrumb
        items={[
          { label: "Quản lý lộ trình", href: "/gv/paths" },
          { label: room.path.title, href: `/gv/paths/${room.path.slug}` },
          { label: room.title },
        ]}
      />

      {saved && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-success/25 bg-success/10 px-4 py-3.5 text-sm font-medium text-success"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>Đã lưu bài học thành công.</p>
        </div>
      )}

      {exerciseSaved && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-success/25 bg-success/10 px-4 py-3.5 text-sm font-medium text-success"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>Đã lưu bài tập thành công.</p>
        </div>
      )}

      <header className="rounded-2xl border border-border/70 bg-background p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <p className="text-xs font-semibold tracking-wide text-primary uppercase">
              Nội dung bài học
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground break-words sm:text-3xl">
              {room.title}
            </h1>
            {room.description.trim() && (
              <p className="text-sm leading-6 text-muted-foreground break-words">
                {room.description}
              </p>
            )}
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="shrink-0 rounded-xl"
          >
            <Link href={`/gv/paths/${room.path.slug}/rooms/${room.id}/edit`}>
              <Pencil className="size-3.5" aria-hidden />
              Chỉnh sửa bài học
            </Link>
          </Button>
        </div>
      </header>

      <section
        aria-label="Lý thuyết bài học"
        className="rounded-2xl border border-border/70 bg-background p-5 sm:p-6"
      >
        <RoomMarkdown content={room.content} />
      </section>

      <section
        className="space-y-4 rounded-2xl border border-border/70 bg-background p-5 sm:p-6"
        aria-label="Bài tập"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div className="space-y-0.5">
            <h2 className="text-lg font-bold text-foreground">
              Bài tập thực hành
            </h2>
            <p className="text-xs text-muted-foreground tabular-nums">
              {room.exercises.length} bài tập trong bài học này
            </p>
          </div>
          <Button asChild size="sm" className="rounded-xl">
            <Link
              href={`/gv/paths/${room.path.slug}/rooms/${room.id}/exercises/new`}
            >
              <Plus className="size-4" aria-hidden />
              Thêm bài tập
            </Link>
          </Button>
        </div>

        {room.exercises.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/25 px-6 py-10 text-center">
            <span
              aria-hidden
              className="grid size-11 place-items-center rounded-2xl bg-secondary/70 text-primary"
            >
              <CodeXml className="size-5" />
            </span>
            <p className="mt-3 text-sm font-semibold text-foreground">
              Bài học chưa có bài tập
            </p>
            <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
              Thêm bài tập lập trình kèm bộ test case để học viên thực hành ngay
              sau khi đọc lý thuyết.
            </p>
            <Button asChild size="sm" className="mt-4 rounded-xl">
              <Link
                href={`/gv/paths/${room.path.slug}/rooms/${room.id}/exercises/new`}
              >
                <Plus className="size-4" aria-hidden />
                Thêm bài tập đầu tiên
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {room.exercises.map((exercise) => (
              <li
                key={exercise.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background p-4 transition-colors hover:border-primary/35"
              >
                <div className="min-w-0 space-y-1.5">
                  <p className="font-semibold text-foreground break-words">
                    {exercise.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground tabular-nums">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 font-semibold",
                        difficultyBadgeClass[exercise.difficulty],
                      )}
                    >
                      {difficultyLabel[exercise.difficulty]}
                    </span>
                    <span>{exercise.points} XP</span>
                    <span>·</span>
                    <span>{exercise._count.testCases} test case</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="rounded-lg"
                  >
                    <Link
                      href={`/gv/paths/${room.path.slug}/rooms/${room.id}/exercises/${exercise.id}/edit`}
                    >
                      <Pencil className="size-3.5" aria-hidden />
                      Sửa
                    </Link>
                  </Button>
                  <DeleteExerciseButton
                    pathSlug={room.path.slug}
                    roomId={room.id}
                    exerciseId={exercise.id}
                    title={exercise.title}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
