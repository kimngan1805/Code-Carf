import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { GradeForm } from "@/features/handwritten/components/grade-form";
import { getHandwrittenReview } from "@/features/handwritten/review";
import { PathBreadcrumb } from "@/features/paths/components/path-badges";
import { formatDateTime } from "@/features/paths/format";
import { RoomMarkdown } from "@/features/rooms/components/room-markdown";
import { AppError } from "@/lib/errors";

export const metadata = { title: "Chấm bài tự luận | Code Carf" };

export default async function GradeSubmissionPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const { submissionId } = await params;
  const review = await getHandwrittenReview(submissionId).catch((error) => {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  });
  const imageHref = `/api/submissions/${review.id}/image`;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <PathBreadcrumb
        items={[
          { label: "Chấm bài tự luận", href: "/gv/grading" },
          { label: review.exercise.title },
        ]}
      />
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">
          {review.lesson
            ? `${review.lesson.pathTitle} · ${review.lesson.title}`
            : ""}
        </p>
        <h1 className="text-2xl font-bold tracking-tight break-words sm:text-3xl">
          {review.exercise.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          Học viên{" "}
          <span className="font-semibold text-foreground">
            {review.learner}
          </span>{" "}
          · Nộp {formatDateTime(review.submittedAt)}
          {review.reviewedAt &&
            ` · Đã chấm ${formatDateTime(review.reviewedAt)}${review.reviewer ? ` bởi ${review.reviewer}` : ""}`}
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section
          aria-labelledby="answer-title"
          className="space-y-3 rounded-2xl border bg-background p-4 sm:p-5"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 id="answer-title" className="font-semibold">
              Bài làm của học viên
            </h2>
            <a
              href={imageHref}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              <ExternalLink className="size-4" aria-hidden />
              Mở ảnh lớn
            </a>
          </div>
          {/* Ảnh riêng tư, chỉ phục vụ qua route có kiểm tra quyền. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageHref}
            alt={`Ảnh bài làm của ${review.learner}`}
            className="w-full rounded-xl border bg-muted/20 object-contain"
          />
        </section>

        <div className="space-y-5">
          <section
            aria-labelledby="grade-title"
            className="space-y-3 rounded-2xl border bg-background p-4 sm:p-5"
          >
            <h2 id="grade-title" className="font-semibold">
              {review.graded ? "Điểm đã chấm" : "Chấm điểm"}
            </h2>
            <GradeForm
              submissionId={review.id}
              submittedAt={review.submittedAt.toISOString()}
              initialScore={
                review.graded && review.score !== null
                  ? review.score / 10
                  : null
              }
              initialFeedback={review.feedback}
              graded={review.graded}
              nextId={review.nextId}
            />
          </section>

          <section
            aria-labelledby="rubric-title"
            className="space-y-3 rounded-2xl border bg-background p-4 sm:p-5"
          >
            <h2 id="rubric-title" className="font-semibold">
              Đáp án mẫu và tiêu chí chấm
            </h2>
            {review.exercise.rubric.trim() ? (
              <RoomMarkdown content={review.exercise.rubric} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Bài này chưa có tiêu chí chấm.
              </p>
            )}
          </section>

          <details className="rounded-2xl border bg-background p-4 sm:p-5">
            <summary className="cursor-pointer font-semibold">Đề bài</summary>
            <div className="mt-3">
              <RoomMarkdown content={review.exercise.prompt} />
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
