import Link from "next/link";
import { ArrowLeft, Clock3, MessageSquareText } from "lucide-react";
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
      {upload?.reviewedAt && upload.score !== null ? (
        <section
          aria-labelledby="grade-result-title"
          className="space-y-3 rounded-2xl border bg-background p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="grade-result-title" className="text-lg font-semibold">
              Kết quả chấm
            </h2>
            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold tabular-nums ${
                upload.status === "ACCEPTED"
                  ? "bg-success/15 text-success"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {(upload.score / 10).toLocaleString("vi-VN")}/10 ·{" "}
              {upload.status === "ACCEPTED" ? "Đạt" : "Chưa đạt"}
            </span>
          </div>
          {upload.feedback ? (
            <p className="flex gap-2 rounded-xl bg-muted/40 p-3 text-sm leading-6 whitespace-pre-line">
              <MessageSquareText
                className="mt-0.5 size-4 shrink-0 text-primary"
                aria-hidden
              />
              {upload.feedback}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Giảng viên không để lại nhận xét.
            </p>
          )}
        </section>
      ) : upload ? (
        <p className="flex items-center gap-2 rounded-2xl border bg-background p-4 text-sm text-muted-foreground">
          <Clock3 className="size-4 text-warning" aria-hidden />
          Đã nộp bài, đang chờ giảng viên chấm. Bạn vẫn học tiếp được bài sau.
        </p>
      ) : null}
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
