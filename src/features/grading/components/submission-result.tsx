import {
  CheckCircle2,
  CircleAlert,
  CircleX,
  MinusCircle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  PracticeSubmissionView,
  PracticeTestView,
} from "../practice-submit";
import {
  compileOutput,
  passedCount,
  summaryView,
  testStatusView,
  type Tone,
} from "../result-view";

const toneClass: Record<Tone, string> = {
  pass: "bg-success/15 text-success",
  fail: "bg-destructive/15 text-destructive",
  warn: "bg-warning/15 text-warning",
  neutral: "bg-muted text-muted-foreground",
};

const toneIcon = {
  pass: CheckCircle2,
  fail: CircleX,
  warn: CircleAlert,
  neutral: MinusCircle,
};

export function SubmissionResult({
  result,
  onDismiss,
}: {
  result: PracticeSubmissionView;
  onDismiss?: () => void;
}) {
  const summary = summaryView(result.status);
  const compile = compileOutput(result.tests);
  const SummaryIcon = toneIcon[summary.tone];
  return (
    <section aria-label="Kết quả chấm" data-testid="submission-result">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 bg-background px-4 py-3 lg:sticky lg:top-0 lg:z-10">
        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold",
            toneClass[summary.tone],
          )}
        >
          <SummaryIcon className="size-4" aria-hidden />
          {summary.title}
        </div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">
            {result.score}/{result.maxScore} điểm · {passedCount(result.tests)}/
            {result.tests.length} test
          </p>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Ẩn kết quả"
              title="Ẩn kết quả"
              className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-muted focus-visible:outline-2"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </div>
      </div>
      <div className="space-y-3 px-4 pb-4">
        <p className="text-sm text-muted-foreground">{result.feedback}</p>
        {compile && (
          <pre
            aria-label="Lỗi biên dịch"
            className="max-h-48 overflow-auto rounded-xl bg-muted p-3 font-mono text-xs"
          >
            {compile}
          </pre>
        )}
        <ol className="space-y-2">
          {result.tests.map((test) => (
            <TestRow key={test.index} test={test} />
          ))}
        </ol>
      </div>
    </section>
  );
}

function TestRow({ test }: { test: PracticeTestView }) {
  const view = testStatusView(test.status);
  const Icon = toneIcon[view.tone];
  // Compile output is shown once above; hidden tests only get their label.
  const detail =
    !test.passed && !test.hidden && test.status !== "COMPILE_ERROR";
  return (
    <li className="rounded-xl border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">
          Test {test.index}
          {test.hidden && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              (ẩn)
            </span>
          )}
        </p>
        <div className="flex items-center gap-3">
          {test.runtimeMs !== undefined && (
            <span className="text-xs text-muted-foreground">
              {test.runtimeMs} ms
            </span>
          )}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
              toneClass[view.tone],
            )}
          >
            <Icon className="size-3.5" aria-hidden />
            {view.label}
          </span>
        </div>
      </div>
      {detail && (
        <div className="mt-3 space-y-2">
          {test.input !== undefined && (
            <Block label="Đầu vào" value={test.input} />
          )}
          {test.expected !== undefined && (
            <Block label="Đầu ra mong đợi" value={test.expected} />
          )}
          {test.feedback && <Block label="Chi tiết" value={test.feedback} />}
        </div>
      )}
    </li>
  );
}

function Block({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <pre className="max-h-40 overflow-auto rounded-lg bg-muted p-2 font-mono text-xs">
        {value}
      </pre>
    </div>
  );
}
