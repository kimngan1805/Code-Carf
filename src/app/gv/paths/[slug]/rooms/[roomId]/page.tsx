import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, CheckCircle2, CodeXml, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeleteExerciseButton } from "@/features/exercises/components/delete-exercise-button";
import { ExerciseItem } from "@/features/exercises/components/exercise-item";
import { MoveExercise } from "@/features/exercises/components/move-exercise";
import { ExercisePreview } from "@/features/exercises/components/exercise-preview";
import { PathBreadcrumb } from "@/features/paths/components/path-badges";
import { stripLessonTemplate } from "@/features/paths/lesson-structure";
import { getManagedRoom } from "@/features/paths/management";
import { RoomMarkdown } from "@/features/rooms/components/room-markdown";
import { RoomHeader } from "@/features/rooms/components/room-header";
import { AppError } from "@/lib/errors";
import { cn } from "@/lib/utils";

const difficultyLabel = {
  EASY: "Dễ",
  MEDIUM: "Trung bình",
  HARD: "Khó",
} as const;

const kindLabel = {
  CODE: "Code",
  QUIZ: "Trắc nghiệm",
  HANDWRITTEN: "Tự luận",
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

  const roomBaseHref = `/gv/paths/${room.path.slug}/rooms/${room.id}`;
  // Giảng viên xem đúng phần học viên sẽ thấy: khung mẫu chưa điền được bỏ đi.
  const theory = stripLessonTemplate(room.content);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
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
          className="flex items-start gap-3 rounded-2xl border border-success/25 bg-success/10 px-4 py-3 text-sm font-medium text-success"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>Đã lưu bài học thành công.</p>
        </div>
      )}
      {exerciseSaved && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-success/25 bg-success/10 px-4 py-3 text-sm font-medium text-success"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>Đã lưu bài tập thành công.</p>
        </div>
      )}

      <RoomHeader
        title={room.title}
        description={room.description}
        pathPublished={room.path.published}
        exerciseCount={room.exercises.length}
        previewHref={`${roomBaseHref}/preview`}
        editHref={`${roomBaseHref}/edit`}
      />

      <section
        aria-labelledby="room-theory-heading"
        className="rounded-2xl border border-border/70 bg-background p-5 sm:p-6"
      >
        <div className="mb-4 flex items-center gap-2 border-b border-border/60 pb-3">
          <BookOpen className="size-4 text-primary" aria-hidden />
          <h2
            id="room-theory-heading"
            className="text-base font-bold text-foreground"
          >
            Lý thuyết bài học
          </h2>
        </div>
        {theory ? (
          <RoomMarkdown content={theory} />
        ) : room.content.trim() ? (
          <p className="text-sm text-muted-foreground">
            Bài mới có khung mẫu, chưa nhập nội dung nên học viên chưa thấy phần
            này. Chọn &ldquo;Chỉnh sửa bài học&rdquo; để điền hoặc xóa khung
            mẫu.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Bài học chưa có nội dung chữ. Không bắt buộc nếu bài đã có tài liệu
            đính kèm hoặc bài tập; muốn viết thì chọn &ldquo;Chỉnh sửa bài
            học&rdquo;, có sẵn khung mẫu để dùng.
          </p>
        )}
      </section>

      <section
        className="space-y-4 rounded-2xl border border-border/70 bg-background p-5 sm:p-6"
        aria-labelledby="room-exercises-heading"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div className="space-y-0.5">
            <h2
              id="room-exercises-heading"
              className="text-base font-bold text-foreground sm:text-lg"
            >
              Bài tập thực hành
            </h2>
            <p className="text-xs text-muted-foreground tabular-nums">
              {room.exercises.length} bài tập trong bài học này
            </p>
          </div>
          <Button asChild size="default" className="rounded-xl">
            <Link href={`${roomBaseHref}/exercises/new`}>
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
              Thêm bài code, trắc nghiệm hoặc tự luận để học viên thực hành ngay
              sau khi đọc lý thuyết.
            </p>
            <Button asChild size="default" className="mt-4 rounded-xl">
              <Link href={`${roomBaseHref}/exercises/new`}>
                <Plus className="size-4" aria-hidden />
                Thêm bài tập đầu tiên
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {room.exercises.map((exercise, index) => (
              <ExerciseItem
                key={exercise.id}
                summary={
                  <>
                    <p className="font-semibold text-foreground break-words">
                      {exercise.title}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground tabular-nums">
                      <span className="rounded-full border border-primary/20 px-2 py-0.5 font-semibold text-primary">
                        {kindLabel[exercise.kind]}
                      </span>
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
                      <span>
                        {exercise.kind === "QUIZ"
                          ? `${exercise.quizQuestions.length} câu hỏi`
                          : exercise.kind === "HANDWRITTEN"
                            ? "Nộp ảnh bài làm"
                            : `${exercise._count.testCases} test case`}
                      </span>
                    </div>
                  </>
                }
                actions={
                  <>
                    <MoveExercise
                      pathSlug={room.path.slug}
                      roomId={room.id}
                      exerciseId={exercise.id}
                      title={exercise.title}
                      first={index === 0}
                      last={index === room.exercises.length - 1}
                    />
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="h-9 rounded-lg border-border bg-background text-foreground hover:border-primary/40 hover:bg-muted hover:text-primary"
                    >
                      <Link
                        href={`${roomBaseHref}/exercises/${exercise.id}/edit`}
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
                  </>
                }
                preview={<ExercisePreview exercise={exercise} />}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
