import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { QuizExercisePage } from "@/features/grading/exercise-page";
import { RoomMarkdown } from "@/features/rooms/components/room-markdown";
import { QuizPlayer } from "./quiz-player";

export function QuizView({ exercise }: { exercise: QuizExercisePage }) {
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
          Trắc nghiệm · {exercise.questions.length} câu · {exercise.points} điểm
          · Đạt khi đúng từ 70%
        </p>
      </header>
      {exercise.prompt.trim() && (
        <section className="rounded-2xl border bg-background p-5">
          <RoomMarkdown content={exercise.prompt} />
        </section>
      )}
      <QuizPlayer
        exerciseId={exercise.id}
        roomId={exercise.room.id}
        questions={exercise.questions}
        lastAttempt={
          exercise.lastAttempt
            ? {
                ...exercise.lastAttempt,
                submittedAt: exercise.lastAttempt.submittedAt.toISOString(),
              }
            : null
        }
      />
    </div>
  );
}
