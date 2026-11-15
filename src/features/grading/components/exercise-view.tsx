import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { RoomMarkdown } from "@/features/rooms/components/room-markdown";
import type { ExercisePage } from "../exercise-page";
import { MAX_SOURCE_LENGTH } from "../submit";
import { ExerciseWorkspace } from "./exercise-workspace";

/**
 * On large screens the page fits the viewport (app header 4rem, main padding
 * 4.5rem): the statement scrolls on its own and the editor, submit bar and
 * result stay side by side on screen, so a result never needs scrolling to.
 * On small screens everything stacks and scrolls normally.
 */
export function ExerciseView({ exercise }: { exercise: ExercisePage }) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 lg:h-[calc(100dvh-8.5rem-1px)] lg:min-h-[32rem]">
      <Link
        href={`/hv/rooms/${exercise.room.id}`}
        className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {exercise.room.title}
      </Link>
      <div className="grid min-h-0 flex-1 items-start gap-6 lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)] lg:items-stretch">
        <div className="min-w-0 space-y-6 lg:overflow-y-auto lg:pr-1">
          <header className="space-y-1">
            <p className="text-sm text-muted-foreground">
              {exercise.path.title}
            </p>
            <h1 className="text-2xl font-bold break-words">{exercise.title}</h1>
            <p className="text-sm text-muted-foreground">
              {exercise.points} điểm · Giới hạn {exercise.timeLimitMs / 1000}{" "}
              giây · {Math.round(exercise.memoryLimitKb / 1024)} MB bộ nhớ
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
          {exercise.sampleTests.length > 0 && (
            <section
              className="space-y-3 rounded-2xl border bg-background p-5"
              aria-labelledby="samples-title"
            >
              <h2 id="samples-title" className="text-lg font-semibold">
                Ví dụ
              </h2>
              {exercise.sampleTests.map((test, index) => (
                <div key={test.id} className="grid gap-3 sm:grid-cols-2">
                  <SampleBlock
                    label={`Đầu vào ${index + 1}`}
                    value={test.input}
                  />
                  <SampleBlock label="Đầu ra mong đợi" value={test.expected} />
                </div>
              ))}
            </section>
          )}
        </div>
        <ExerciseWorkspace
          userId={exercise.userId}
          exerciseId={exercise.id}
          maxSourceLength={MAX_SOURCE_LENGTH}
        />
      </div>
    </div>
  );
}

function SampleBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <pre className="min-h-10 overflow-x-auto rounded-xl bg-muted p-3 font-mono text-sm">
        {value}
      </pre>
    </div>
  );
}
