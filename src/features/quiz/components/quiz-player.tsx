"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, RotateCcw, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { submitQuizAction } from "../actions";
import type { QuizGrade } from "../grading";

type Question = { prompt: string; options: string[] };
type Attempt = QuizGrade & { submittedAt?: string; roomCompleted?: boolean };

const letter = (index: number) => String.fromCharCode(65 + index);

export function QuizPlayer({
  exerciseId,
  roomId,
  questions,
  lastAttempt,
}: {
  exerciseId: string;
  roomId: string;
  questions: Question[];
  lastAttempt: Attempt | null;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<number[]>(() =>
    lastAttempt
      ? lastAttempt.results.map((result) => result.chosen)
      : questions.map(() => -1),
  );
  const [result, setResult] = useState<Attempt | null>(lastAttempt);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const answered = answers.filter((answer) => answer >= 0).length;

  async function submit() {
    if (pending) return;
    setPending(true);
    setError("");
    const response = await submitQuizAction({ exerciseId, answers });
    setPending(false);
    if (response.error || !response.data) {
      setError(response.error ?? "Chưa thể nộp bài.");
      return;
    }
    setResult(response.data);
    router.refresh();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function retry() {
    setResult(null);
    setAnswers(questions.map(() => -1));
  }

  return (
    <div className="space-y-5">
      {result && (
        <section
          role="status"
          className={cn(
            "rounded-2xl border-2 p-5",
            result.passed
              ? "border-success/40 bg-success/10"
              : "border-warning/40 bg-warning/10",
          )}
        >
          <p
            className={cn(
              "text-lg font-bold",
              result.passed ? "text-success" : "text-warning",
            )}
          >
            {result.passed ? "Đạt" : "Chưa đạt"}: đúng {result.correct}/
            {result.total} câu · {result.score} điểm
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.passed
              ? result.roomCompleted
                ? "Bạn đã hoàn thành bài học này."
                : "Xem lại giải thích bên dưới để nhớ lâu hơn."
              : "Cần đúng từ 70% số câu để đạt. Xem lại giải thích rồi làm lại nhé."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={retry}>
              <RotateCcw className="size-4" aria-hidden />
              Làm lại
            </Button>
            <Button asChild size="sm">
              <Link href={`/hv/rooms/${roomId}`}>Về bài học</Link>
            </Button>
          </div>
        </section>
      )}

      <ol className="space-y-4">
        {questions.map((question, index) => {
          const review = result?.results[index];
          return (
            <li
              key={index}
              className={cn(
                "rounded-2xl border-2 bg-background p-5",
                review
                  ? review.correct
                    ? "border-success/40"
                    : "border-destructive/40"
                  : "border-border",
              )}
            >
              <fieldset disabled={!!result || pending}>
                <legend className="flex gap-3 font-semibold">
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand-sky-light/70 text-xs font-bold text-primary">
                    {index + 1}
                  </span>
                  <span className="pt-0.5 break-words whitespace-pre-line">
                    {question.prompt}
                  </span>
                </legend>
                <div className="mt-4 space-y-2">
                  {question.options.map((option, optionIndex) => {
                    const chosen = answers[index] === optionIndex;
                    const isAnswer = review?.answer === optionIndex;
                    return (
                      <label
                        key={optionIndex}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring",
                          review
                            ? isAnswer
                              ? "border-success bg-success/10"
                              : chosen
                                ? "border-destructive bg-destructive/10"
                                : "border-transparent bg-muted/30"
                            : chosen
                              ? "border-primary bg-secondary/30"
                              : "border-border hover:border-primary/40",
                          result && "cursor-default",
                        )}
                      >
                        <input
                          type="radio"
                          name={`q-${index}`}
                          checked={chosen}
                          onChange={() =>
                            setAnswers((all) =>
                              all.map((value, i) =>
                                i === index ? optionIndex : value,
                              ),
                            )
                          }
                          className="sr-only"
                        />
                        <span
                          aria-hidden
                          className={cn(
                            "grid size-7 shrink-0 place-items-center rounded-full border-2 text-xs font-bold",
                            chosen && !review
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border text-muted-foreground",
                          )}
                        >
                          {review && isAnswer ? (
                            <Check className="size-4 text-success" />
                          ) : review && chosen ? (
                            <X className="size-4 text-destructive" />
                          ) : (
                            letter(optionIndex)
                          )}
                        </span>
                        <span className="min-w-0 break-words">{option}</span>
                        {review && isAnswer && (
                          <span className="sr-only"> (đáp án đúng)</span>
                        )}
                        {review && chosen && !isAnswer && (
                          <span className="sr-only"> (bạn đã chọn)</span>
                        )}
                      </label>
                    );
                  })}
                </div>
                {review?.explanation && (
                  <p className="mt-3 rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">
                    <strong className="text-foreground">Giải thích: </strong>
                    {review.explanation}
                  </p>
                )}
              </fieldset>
            </li>
          );
        })}
      </ol>

      {!result && (
        <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-primary bg-background p-4 shadow-[4px_4px_0_0_var(--brand-blue)]">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Đã trả lời {answered}/{questions.length} câu
          </p>
          {error && (
            <p role="alert" className="w-full text-sm text-destructive">
              {error}
            </p>
          )}
          <Button
            type="button"
            onClick={submit}
            disabled={pending || answered === 0}
            className="rounded-full"
          >
            {pending ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
            ) : (
              <Send className="size-4" aria-hidden />
            )}
            {pending ? "Đang chấm..." : "Nộp bài"}
          </Button>
        </div>
      )}
    </div>
  );
}
