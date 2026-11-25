import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  Circle,
  Eye,
  LockKeyhole,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { getRoomPage } from "../service";
import { stripLessonTemplate } from "@/features/paths/lesson-structure";
import { RoomMarkdown } from "./room-markdown";
import { RefreshRoom } from "./refresh-room";
import { RoomAttachments } from "./room-attachments";
import { ExerciseReportForm } from "@/features/exercise-reports/components/report-form";

const EXERCISE_KIND_LABELS = {
  CODE: "Lập trình",
  HANDWRITTEN: "Tự luận",
  QUIZ: "Trắc nghiệm",
} as const;

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
  preview,
}: {
  room: Awaited<ReturnType<typeof getRoomPage>>;
  preview?: {
    backHref: string;
    editHref: string;
    pathPublished: boolean;
  };
}) {
  const isPreview = Boolean(preview);
  // Nội dung chữ không bắt buộc: bài có thể chỉ có slide/PDF hoặc bài tập.
  // Khung mẫu chưa điền không hiện cho học viên.
  const theory = room.accessible ? stripLessonTemplate(room.content) : "";
  const hasTheory = theory !== "";
  const backHref = preview ? preview.backHref : `/hv/paths/${room.path.slug}`;
  const backLabel = preview ? "Quay lại quản lý bài học" : room.path.title;
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {preview && (
        <section
          role="status"
          aria-label="Chế độ xem trước"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-secondary/40 p-4"
        >
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-primary">
                <Eye className="size-4" aria-hidden />
                Chế độ xem trước
              </span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  preview.pathPublished
                    ? "bg-success/15 text-success"
                    : "bg-warning/15 text-warning"
                }`}
              >
                {preview.pathPublished
                  ? "Lộ trình đã xuất bản"
                  : "Lộ trình bản nháp"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Hiển thị giao diện như học viên nhìn thấy (tiến độ mô phỏng, không
              lưu bài nộp thật).
              {!preview.pathPublished &&
                " Học viên chỉ thấy bài này sau khi lộ trình được xuất bản."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={preview.editHref}>Chỉnh sửa bài học</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={preview.backHref}>Quay lại</Link>
            </Button>
          </div>
        </section>
      )}
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {backLabel}
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
              <Link href={backHref}>
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
            {!isPreview && <RefreshRoom />}
          </header>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
            {hasTheory ? (
              <section
                className="min-w-0 space-y-5 rounded-2xl border bg-background p-4 sm:p-6"
                aria-labelledby="theory-title"
              >
                <h2 id="theory-title" className="text-xl font-semibold">
                  Lý thuyết
                </h2>
                <RoomMarkdown content={theory} />
              </section>
            ) : room.attachments.length ? (
              // Bài chỉ có slide/PDF: tài liệu chiếm chỗ phần lý thuyết.
              <div className="min-w-0">
                <RoomAttachments
                  roomId={room.id}
                  attachments={room.attachments}
                />
              </div>
            ) : (
              <section className="min-w-0 rounded-2xl border bg-background p-4 sm:p-6">
                <p className="text-muted-foreground">
                  Bài học này gồm các bài tập thực hành bên dưới.
                </p>
              </section>
            )}
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
          {hasTheory && (
            <RoomAttachments roomId={room.id} attachments={room.attachments} />
          )}
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
                          {EXERCISE_KIND_LABELS[exercise.kind]} ·{" "}
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
                    {isPreview ? (
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Button type="button" size="sm" disabled>
                          {exercise.kind === "HANDWRITTEN"
                            ? "Nộp ảnh bài làm"
                            : "Làm bài"}
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          Chế độ xem trước — chỉ học viên mới nộp bài.
                        </span>
                      </div>
                    ) : (
                      <Button asChild size="sm" className="mt-4">
                        <Link href={`/hv/exercises/${exercise.id}`}>
                          {exercise.kind === "HANDWRITTEN"
                            ? "Nộp ảnh bài làm"
                            : "Làm bài"}
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
                    {!isPreview && (
                      <div className="mt-4">
                        <ExerciseReportForm exerciseId={exercise.id} />
                      </div>
                    )}
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
