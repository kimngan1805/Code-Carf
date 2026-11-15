import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  Circle,
  LockKeyhole,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { getRoomPage } from "../service";
import { RoomMarkdown } from "./room-markdown";
import { RefreshRoom } from "./refresh-room";

const states = {
  not_started: {
    label: "Chưa làm",
    Icon: Circle,
    className: "bg-muted text-muted-foreground",
  },
  submitted: {
    label: "Đã nộp",
    Icon: Clock3,
    className: "bg-secondary text-secondary-foreground",
  },
  passed: {
    label: "Đạt",
    Icon: CheckCircle2,
    className: "bg-success/10 text-foreground",
  },
};

export function RoomView({
  room,
}: {
  room: Awaited<ReturnType<typeof getRoomPage>>;
}) {
  const pathHref = `/hv/paths/${room.path.slug}`;
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <Link
        href={pathHref}
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {room.path.title}
      </Link>
      {!room.accessible ? (
        <section
          className="space-y-5 rounded-2xl border bg-background p-6 sm:p-8"
          aria-labelledby="locked-title"
        >
          <LockKeyhole className="size-10 text-primary" aria-hidden />
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{room.title}</p>
            <h1 id="locked-title" className="text-2xl font-bold">
              Bài học đang khóa
            </h1>
            <p className="text-muted-foreground">{room.message}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={pathHref}>
                {room.reason === "enrollment"
                  ? "Đăng ký lộ trình"
                  : "Về lộ trình học"}
              </Link>
            </Button>
            <RefreshRoom />
          </div>
        </section>
      ) : (
        <>
          <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <p className="flex items-center gap-2 text-sm font-semibold text-primary">
                <BookOpen className="size-4" aria-hidden />
                Bài học
              </p>
              <h1 className="text-2xl font-bold break-words sm:text-3xl">
                {room.title}
              </h1>
              {room.description && (
                <p className="text-muted-foreground break-words">
                  {room.description}
                </p>
              )}
            </div>
            <RefreshRoom />
          </header>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <section
              className="min-w-0 space-y-5 rounded-2xl border bg-background p-4 sm:p-6"
              aria-labelledby="theory-title"
            >
              <h2 id="theory-title" className="text-xl font-semibold">
                Lý thuyết
              </h2>
              {room.content.trim() ? (
                <RoomMarkdown content={room.content} />
              ) : (
                <p className="text-muted-foreground">
                  Bài học chưa có nội dung lý thuyết.
                </p>
              )}
            </section>
            <aside className="h-fit space-y-4 rounded-2xl border bg-background p-5">
              <h2 className="font-semibold">Tiến độ bài tập</h2>
              <p className="text-3xl font-bold text-primary">
                {room.passedExercises}
                <span className="text-lg font-normal text-muted-foreground">
                  {" "}
                  / {room.exercises.length}
                </span>
              </p>
              <Progress
                value={
                  room.exercises.length
                    ? room.passedExercises / room.exercises.length
                    : 0
                }
                label="Bài tập đã đạt"
              />
              <p className="text-sm text-muted-foreground">
                Số bài tập đã đạt trong bài học này.
              </p>
              <ul className="space-y-2">
                {Object.values(states).map(({ label, Icon }) => (
                  <li
                    key={label}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <Icon className="size-4" aria-hidden />
                    {label}
                  </li>
                ))}
              </ul>
            </aside>
          </div>
          <section className="space-y-4" aria-labelledby="exercises-title">
            <h2 id="exercises-title" className="text-xl font-semibold">
              Bài tập ({room.exercises.length})
            </h2>
            {!room.exercises.length && (
              <p className="rounded-2xl border bg-background p-5 text-muted-foreground">
                Bài học chưa có bài tập.
              </p>
            )}
            <ol className="space-y-3">
              {room.exercises.map((exercise, index) => {
                const { label, Icon, className } = states[exercise.state];
                return (
                  <li
                    key={exercise.id}
                    className="min-w-0 rounded-2xl border bg-background p-4 sm:p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <h3 className="font-semibold break-words">
                          {index + 1}. {exercise.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {exercise.kind === "CODE" ? "Lập trình" : "Tự luận"} ·{" "}
                          {exercise.points} điểm
                        </p>
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${className}`}
                      >
                        <Icon className="size-3.5" aria-hidden />
                        {label}
                      </span>
                    </div>
                    {exercise.kind === "CODE" && (
                      <Button asChild size="sm" className="mt-4">
                        <Link href={`/hv/exercises/${exercise.id}`}>
                          Làm bài
                        </Link>
                      </Button>
                    )}
                    <details className="mt-4 border-t pt-3">
                      <summary className="cursor-pointer rounded text-sm font-semibold text-primary focus-visible:outline-2 focus-visible:outline-ring">
                        Xem đề bài
                      </summary>
                      <div className="mt-4">
                        {exercise.prompt.trim() ? (
                          <RoomMarkdown content={exercise.prompt} />
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Chưa có mô tả bài tập.
                          </p>
                        )}
                      </div>
                    </details>
                  </li>
                );
              })}
            </ol>
          </section>
        </>
      )}
    </div>
  );
}
