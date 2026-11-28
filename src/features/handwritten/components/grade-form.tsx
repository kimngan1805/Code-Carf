"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, LoaderCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { gradeHandwrittenAction } from "../review-actions";

/** Nhập điểm thang 10 (bước 0,5) và nhận xét cho một bài tự luận. */
export function GradeForm({
  submissionId,
  submittedAt,
  initialScore,
  initialFeedback,
  graded,
  nextId,
}: {
  submissionId: string;
  /** ISO time of the image being graded; saving fails if the learner replaced it. */
  submittedAt: string;
  /** Điểm thang 10, null khi chưa chấm. */
  initialScore: number | null;
  initialFeedback: string;
  graded: boolean;
  nextId: string | null;
}) {
  const router = useRouter();
  const [score, setScore] = useState(
    initialScore === null ? "" : String(initialScore),
  );
  const [feedback, setFeedback] = useState(initialFeedback);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const value = Number(score.replace(",", "."));
  const valid =
    score.trim() !== "" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 10 &&
    Number.isInteger(value * 2);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || pending) return;
    setPending(true);
    setError("");
    setSaved(false);
    const result = await gradeHandwrittenAction({
      submissionId,
      submittedAt,
      score: value,
      feedback,
    });
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="grade-score" className="text-sm font-semibold">
          Điểm{" "}
          <span className="font-normal text-muted-foreground">(thang 10)</span>
        </label>
        <div className="flex items-center gap-2">
          <input
            id="grade-score"
            inputMode="decimal"
            value={score}
            disabled={pending}
            onChange={(event) => {
              setScore(event.target.value);
              setSaved(false);
            }}
            placeholder="Ví dụ 8,5"
            aria-invalid={score.trim() !== "" && !valid}
            aria-describedby="grade-score-help"
            className="h-11 w-28 rounded-xl border-2 border-input bg-background px-3 text-lg font-semibold tabular-nums focus-visible:border-primary focus-visible:outline-none aria-invalid:border-destructive"
          />
          <span className="text-sm text-muted-foreground">/ 10</span>
        </div>
        <p
          id="grade-score-help"
          className={
            score.trim() !== "" && !valid
              ? "text-xs text-destructive"
              : "text-xs text-muted-foreground"
          }
        >
          {score.trim() !== "" && !valid
            ? "Nhập từ 0 đến 10, lẻ theo bước 0,5 (ví dụ 7 hoặc 7,5)."
            : "Từ 5 điểm trở lên là Đạt."}
        </p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="grade-feedback" className="text-sm font-semibold">
          Nhận xét{" "}
          <span className="font-normal text-muted-foreground">
            (học viên sẽ thấy)
          </span>
        </label>
        <textarea
          id="grade-feedback"
          rows={5}
          maxLength={2000}
          value={feedback}
          disabled={pending}
          onChange={(event) => {
            setFeedback(event.target.value);
            setSaved(false);
          }}
          placeholder="Điểm tốt, chỗ cần sửa..."
          className="block w-full resize-y rounded-xl border-2 border-input bg-background p-3 text-sm leading-6 focus-visible:border-primary focus-visible:outline-none"
        />
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {saved && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border border-success/25 bg-success/10 p-3 text-sm font-medium text-success"
        >
          <CheckCircle2 className="size-4" aria-hidden />
          Đã lưu điểm, học viên đã nhận thông báo.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={!valid || pending}>
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
          ) : (
            <Save className="size-4" aria-hidden />
          )}
          {pending ? "Đang lưu..." : graded ? "Lưu điểm mới" : "Lưu điểm"}
        </Button>
        {(saved || graded) && nextId && (
          <Button asChild variant="outline">
            <Link href={`/gv/grading/${nextId}`}>
              Bài chờ chấm tiếp theo
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        )}
      </div>
    </form>
  );
}
