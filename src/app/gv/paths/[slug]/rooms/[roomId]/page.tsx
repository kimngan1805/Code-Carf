import Link from "next/link";
import { notFound } from "next/navigation";
import { getManagedRoom } from "@/features/paths/management";
import { AppError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { RoomMarkdown } from "@/features/rooms/components/room-markdown";
import { RoomPublication } from "@/features/rooms/components/room-publication";
import { DeleteExerciseButton } from "@/features/exercises/components/delete-exercise-button";
import { Eye, Plus } from "lucide-react";

const difficultyLabel = {
  EASY: "Dễ",
  MEDIUM: "Trung bình",
  HARD: "Khó",
} as const;

export default async function ManagedRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; roomId: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { slug, roomId } = await params;
  const saved = (await searchParams).saved === "1";
  const room = await getManagedRoom(slug, roomId).catch((error) => {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  });
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Link
        href={`/gv/paths/${room.path.slug}`}
        className="text-sm font-semibold text-primary hover:underline"
      >
        ← {room.path.title}
      </Link>
      {saved && (
        <p
          role="status"
          className="rounded-xl bg-success/10 p-4 text-sm text-success"
        >
          Đã lưu bài học thành công.
        </p>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              room.published
                ? "bg-success/15 text-success"
                : "bg-warning/15 text-warning"
            }`}
          >
            {room.published ? "Đã xuất bản" : "Bản nháp"}
          </span>
          <h1 className="text-2xl font-bold text-primary break-words">
            {room.title}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="secondary">
            <Link href={`/gv/paths/${room.path.slug}/rooms/${room.id}/preview`}>
              <Eye className="size-4" aria-hidden />
              Xem trước
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/gv/paths/${room.path.slug}/rooms/${room.id}/edit`}>
              Chỉnh sửa bài học
            </Link>
          </Button>
        </div>
      </div>
      <RoomPublication roomId={room.id} published={room.published} />
      <p className="text-muted-foreground break-words">{room.description}</p>
      <section className="rounded-2xl border bg-background p-4 sm:p-6">
        <RoomMarkdown content={room.content} />
      </section>
      <section className="space-y-4" aria-label="Bài tập">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Bài tập</h2>
          <Button asChild>
            <Link
              href={`/gv/paths/${room.path.slug}/rooms/${room.id}/exercises/new`}
            >
              <Plus className="size-4" aria-hidden />
              Thêm bài tập
            </Link>
          </Button>
        </div>
        {!room.exercises.length && (
          <p className="text-muted-foreground">Bài học chưa có bài tập.</p>
        )}
        <ul className="space-y-3">
          {room.exercises.map((exercise) => (
            <li
              key={exercise.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background p-4"
            >
              <div className="min-w-0">
                <p className="font-semibold break-words">{exercise.title}</p>
                <p className="text-sm text-muted-foreground">
                  {difficultyLabel[exercise.difficulty]} · {exercise.points} XP
                  · {exercise._count.testCases} test
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={`/gv/paths/${room.path.slug}/rooms/${room.id}/exercises/${exercise.id}/edit`}
                  >
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
      </section>
    </div>
  );
}
