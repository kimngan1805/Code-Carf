import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SubmissionDetail } from "../history";
import {
  formatScore,
  formatSubmittedAt,
  languageLabel,
  submissionStatusView,
} from "../history-view";
import { toneClass } from "./submission-result";

export function SubmissionDetailView({
  submission,
}: {
  submission: SubmissionDetail;
}) {
  const status = submissionStatusView(submission.status);
  const facts = [
    ["Nộp lúc", formatSubmittedAt(submission.createdAt)],
    ["Ngôn ngữ", languageLabel(submission.language)],
    ["Điểm", formatScore(submission.score, submission.maxScore)],
    [
      "Thời gian chạy",
      submission.runtimeMs === null ? "—" : `${submission.runtimeMs} ms`,
    ],
    [
      "Bộ nhớ",
      submission.memoryKb === null
        ? "—"
        : `${(submission.memoryKb / 1024).toFixed(1)} MB`,
    ],
  ];
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <Link
        href="/hv/submissions"
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Lịch sử nộp bài
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          {submission.room && (
            <p className="text-sm text-muted-foreground">
              {submission.room.title}
            </p>
          )}
          <h1 className="text-2xl font-bold break-words">
            {submission.exercise.title}
          </h1>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 rounded-full px-3 py-1 text-sm font-semibold",
            toneClass[status.tone],
          )}
        >
          {status.label}
        </span>
      </header>
      <dl className="grid gap-4 rounded-2xl border bg-background p-5 sm:grid-cols-3 lg:grid-cols-5">
        {facts.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs font-semibold text-muted-foreground">
              {label}
            </dt>
            <dd className="mt-1 text-sm font-semibold break-words">{value}</dd>
          </div>
        ))}
      </dl>
      {submission.feedback && (
        <section
          className="space-y-2 rounded-2xl border bg-background p-5"
          aria-labelledby="feedback-title"
        >
          <h2 id="feedback-title" className="font-semibold">
            Nhận xét
          </h2>
          <p className="text-sm text-muted-foreground">{submission.feedback}</p>
        </section>
      )}
      <section
        className="overflow-hidden rounded-2xl border bg-background"
        aria-labelledby="code-title"
      >
        <h2 id="code-title" className="border-b px-5 py-3 font-semibold">
          Mã nguồn đã nộp
        </h2>
        {submission.source ? (
          <pre className="max-h-[32rem] overflow-auto p-5 font-mono text-sm">
            <code>{submission.source}</code>
          </pre>
        ) : (
          <p className="p-5 text-sm text-muted-foreground">
            Bài nộp này không có mã nguồn.
          </p>
        )}
      </section>
      {submission.room && (
        <Button asChild>
          <Link href={`/hv/exercises/${submission.exercise.id}`}>
            Làm lại bài này
          </Link>
        </Button>
      )}
    </div>
  );
}
