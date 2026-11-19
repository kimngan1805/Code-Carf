import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { HandwrittenExercisePage } from "@/features/grading/exercise-page";
import { RoomMarkdown } from "@/features/rooms/components/room-markdown";
import { isFinalStatus } from "../rules";
import { HandwrittenUpload } from "./handwritten-upload";

export function HandwrittenView({
  exercise,
}: {
  exercise: HandwrittenExercisePage;
}) {
  const { upload } = exercise;
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <Link
        href={`/hv/rooms/${exercise.room.id}`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {exercise.room.title}
      </Link>
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">{exercise.path.title}</p>
        <h1 className="text-2xl font-bold break-words">{exercise.title}</h1>
        <p className="text-sm text-muted-foreground">
          {exercise.points} điểm · Làm bài ra giấy rồi chụp ảnh để nộp
        </p>
      </header>
      <section
        className="rounded-2xl border bg-background p-5"
        aria-labelledby="prompt-title"
      >
        <h2 id="prompt-title" className="mb-3 text-lg font-semibold">
          Đề bài
        </h2>
        {exercise.prompt.trim() ? (
          <RoomMarkdown content={exercise.prompt} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Chưa có mô tả bài tập.
          </p>
        )}
      </section>
      <HandwrittenUpload
        key={upload?.id ?? "new"}
        exerciseId={exercise.id}
        current={
          upload
            ? {
                id: upload.id,
                submittedAt: upload.submittedAt.toISOString(),
                locked: isFinalStatus(upload.status),
              }
            : null
        }
      />
    </div>
  );
}
