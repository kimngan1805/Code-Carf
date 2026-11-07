"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, Clock3, FileCode2, Send, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { languages, type SolutionLanguage } from "../languages";
import { cn } from "@/lib/utils";
import type {
  ContestSubmissionResult,
  ContestWorkspaceData,
} from "../workspace";
import { draftKey } from "../clock";
import { formatDuration } from "../time";
import { useServerClock } from "./use-server-clock";
import { useLocalDraft } from "@/hooks/use-local-draft";
import { useServerDraft } from "./use-server-draft";
import { useContestFinalization } from "./use-contest-finalization";
import { FinalizationNotice } from "./expired-contest";
import type { ContestDraftInput } from "../draft-schema";
import { ContestSubmissionDialog } from "./contest-submission-dialog";
import { useContestEvents } from "@/features/proctoring/components/use-contest-events";
import { ProctoringNotice } from "@/features/proctoring/components/proctoring-notice";
import { exitExamFullscreen } from "../fullscreen";

const CodeEditor = dynamic(
  () =>
    import("@/features/grading/components/code-editor").then(
      (module) => module.CodeEditor,
    ),
  {
    ssr: false,
    loading: () => (
      <p className="p-6 text-sm text-muted-foreground">
        Đang tải trình soạn thảo...
      </p>
    ),
  },
);

type Exercise = ContestWorkspaceData["exercises"][number];

function SolutionPanel({
  exercise,
  data,
  closed,
  submitted,
  isLast,
  onSubmitted,
  onSnapshot,
}: {
  exercise: Exercise;
  data: ContestWorkspaceData;
  closed: boolean;
  submitted: boolean;
  isLast: boolean;
  onSubmitted: (result: ContestSubmissionResult) => void;
  onSnapshot: (snapshot: ContestDraftInput) => void;
}) {
  const [language, setLanguage] = useState<SolutionLanguage>("python");
  const selected = languages.find((item) => item.id === language)!;
  const { source, setSource } = useLocalDraft(
    draftKey(data.userId, data.contest.id, exercise.id, language),
    selected.starter,
  );
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();
  const inFlight = useRef(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [storageFailed, setStorageFailed] = useState(false);
  const [simpleEditor, setSimpleEditor] = useState(false);
  useEffect(() => {
    if (!closed && source.length <= data.maxSourceLength)
      onSnapshot({
        exerciseId: exercise.kind === "CODE" ? exercise.id : null,
        source: exercise.kind === "CODE" ? source : "",
        language,
      });
  }, [
    closed,
    source,
    language,
    exercise.id,
    exercise.kind,
    onSnapshot,
    data.maxSourceLength,
  ]);
  async function submit() {
    if (inFlight.current || closed || submitted) return;
    inFlight.current = true;
    setPending(true);
    setError("");
    setFeedback("");
    try {
      const response = await fetch(
        `/api/contests/${encodeURIComponent(data.contest.slug)}/submissions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exerciseId: exercise.id, source, language }),
        },
      );
      const result = await response.json();
      if (result.error?.code === "EXERCISE_ALREADY_SUBMITTED") {
        setFeedback(result.error.message);
        router.refresh();
        return;
      }
      if (!response.ok)
        throw new Error(result.error?.message ?? "Không thể nộp bài.");
      onSubmitted(result.data);
      setFeedback(result.data.feedback);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Mất kết nối. Vui lòng thử lại.",
      );
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }
  function updateSource(value: string) {
    setStorageFailed(!setSource(value));
  }

  if (exercise.kind !== "CODE")
    return (
      <div className="rounded-2xl border bg-background p-6">
        <h2 className="font-bold">Bài viết tay</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Bài này yêu cầu nộp ảnh và không hỗ trợ nộp code trong trình soạn
          thảo.
        </p>
      </div>
    );
  return (
    <section
      className="min-w-0 overflow-hidden rounded-2xl border bg-background"
      aria-label="Trình soạn thảo bài làm"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <label className="flex items-center gap-3 text-sm font-semibold">
          Ngôn ngữ
          <select
            value={language}
            disabled={pending || closed}
            onChange={(event) => {
              setLanguage(event.target.value as SolutionLanguage);
              setFeedback("");
              setError("");
            }}
            className="h-9 rounded-lg border bg-background px-3 focus-visible:outline-2"
          >
            {languages.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => setSimpleEditor(!simpleEditor)}
          className="text-xs font-semibold text-primary underline underline-offset-4 focus-visible:outline-2"
        >
          {simpleEditor ? "Dùng editor nâng cao" : "Dùng editor đơn giản"}
        </button>
      </div>
      {simpleEditor ? (
        <textarea
          aria-label="Mã nguồn"
          spellCheck={false}
          value={source}
          readOnly={closed || pending}
          onChange={(event) => updateSource(event.target.value)}
          className="block min-h-96 w-full resize-y bg-background p-4 font-mono text-sm focus-visible:outline-2"
        />
      ) : (
        <CodeEditor
          value={source}
          onChange={updateSource}
          language={language}
          readOnly={closed || pending}
        />
      )}
      <div className="space-y-3 border-t p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p
            className={cn(
              "flex items-center gap-1.5 text-xs",
              storageFailed ? "text-warning" : "text-muted-foreground",
            )}
          >
            <Check className="size-3.5" aria-hidden />
            {storageFailed
              ? "Không lưu được bản nháp. Hãy sao chép code trước khi rời trang."
              : "Bản nháp được lưu trên trình duyệt này."}
          </p>
          <Button
            onClick={() => {
              if (isLast) setConfirming(true);
              else void submit();
            }}
            disabled={
              closed ||
              pending ||
              submitted ||
              !source.trim() ||
              source.length > data.maxSourceLength
            }
          >
            <Send className="size-4" aria-hidden />
            {pending
              ? "Đang nộp..."
              : submitted
                ? "Đã nộp bài"
                : isLast
                  ? "Nộp bài"
                  : "Nộp bài và sang bài tiếp theo"}
          </Button>
        </div>
        {source.length > data.maxSourceLength && (
          <p className="text-sm text-destructive">Code vượt giới hạn 64 KB.</p>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        {feedback && (
          <p
            role="status"
            className="rounded-xl bg-secondary/40 p-3 text-sm text-primary"
          >
            {feedback}
          </p>
        )}
      </div>
      <ContestSubmissionDialog
        open={confirming && !closed && !submitted}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          void submit();
        }}
      />
    </section>
  );
}

export function ContestWorkspace({ data }: { data: ContestWorkspaceData }) {
  const router = useRouter();
  const [completionOpen, setCompletionOpen] = useState(false);
  const detailUrl = `/contests/${encodeURIComponent(data.contest.slug)}`;
  useEffect(() => {
    if (!completionOpen) return;
    const timeout = window.setTimeout(() => router.replace(detailUrl), 2500);
    return () => window.clearTimeout(timeout);
  }, [completionOpen, detailUrl, router]);
  const [selectedId, setSelectedId] = useState(
    data.progress.nextExerciseId ?? data.exercises[0]?.id ?? "",
  );
  const [progress, setProgress] = useState(data.progress);
  // A refresh after another tab submits must lock that exercise here as well.
  const submittedExerciseIds = [
    ...new Set([
      ...data.progress.submittedExerciseIds,
      ...progress.submittedExerciseIds,
    ]),
  ];
  const completed = progress.finished || data.progress.finished;
  const clock = useServerClock(
    data.contest.slug,
    data.serverNow,
    Date.parse(data.contest.deadlineAt),
  );
  const remaining = clock.deadlineAt - clock.now;
  const closed = completed || clock.blocked || remaining <= 0;
  const proctoring = useContestEvents(
    data.contest.slug,
    !closed,
    data.proctoring,
  );
  useEffect(() => {
    if (closed) void exitExamFullscreen();
  }, [closed]);
  const serverDraft = useServerDraft(data.contest.slug, closed);
  const finalization = useContestFinalization(
    data.contest.slug,
    remaining <= 0 || completed,
  );
  const exercise = data.exercises.find((item) => item.id === selectedId);
  function recordResult(result: ContestSubmissionResult) {
    setProgress(result.progress);
    if (result.progress.finished) setCompletionOpen(true);
    if (result.progress.nextExerciseId)
      setSelectedId(result.progress.nextExerciseId);
  }
  return (
    <div className="mx-auto max-w-screen-2xl space-y-5">
      <ContestSubmissionDialog
        open={completionOpen}
        completed
        onConfirm={() => router.replace(detailUrl)}
        onCancel={() => router.replace(detailUrl)}
      />
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-background p-5">
        <div className="min-w-0">
          <h1 className="break-words text-xl font-bold">
            {data.contest.title}
          </h1>
        </div>
        <div
          className={cn(
            "rounded-xl px-5 py-3 text-center",
            completed
              ? "bg-secondary/50 text-primary"
              : closed
                ? "bg-destructive/10 text-destructive"
                : remaining < 300000
                  ? "bg-warning/10 text-warning"
                  : "bg-secondary/50 text-primary",
          )}
        >
          <p className="mb-1 flex items-center justify-center gap-2 text-xs font-semibold">
            <Clock3 className="size-3.5" aria-hidden />
            {completed ? "ĐÃ HOÀN THÀNH" : "THỜI GIAN LÀM BÀI CỦA BẠN"}
          </p>
          <p role="timer" className="font-mono text-2xl font-bold tabular-nums">
            {completed ? "Đã nộp bài" : formatDuration(remaining)}
          </p>
        </div>
      </header>
      {!closed && <ProctoringNotice state={proctoring} />}
      {!closed && serverDraft.state === "error" && (
        <p role="alert" className="text-sm text-warning">
          Chưa lưu được bài. Hãy kiểm tra kết nối.
        </p>
      )}
      {completed && (
        <p
          role="status"
          className="rounded-xl bg-secondary p-4 font-semibold text-primary"
        >
          Bạn đã nộp tất cả bài và hoàn thành lượt thi.
        </p>
      )}
      {remaining <= 0 && !completed && (
        <div className="space-y-3">
          <FinalizationNotice finalization={finalization} />
          {finalization.result && (
            <Button onClick={() => router.refresh()}>Xem kết quả</Button>
          )}
        </div>
      )}
      {closed && !completed && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {remaining <= 0
            ? "Đã hết thời gian làm bài. Không thể nộp thêm bài mới."
            : "Lượt thi không còn khả dụng. Vui lòng kiểm tra lại ở trang chi tiết."}{" "}
          Bản nháp vẫn được giữ trên trình duyệt.
        </p>
      )}
      {clock.connectionLost && (
        <p
          role="status"
          className="rounded-xl bg-warning/10 p-3 text-sm text-warning"
        >
          Chưa đồng bộ lại được với máy chủ. Đồng hồ vẫn tiếp tục chạy; hãy kiểm
          tra kết nối trước khi nộp bài.
        </p>
      )}
      {!exercise ? (
        <section className="rounded-2xl border bg-background p-10 text-center">
          <FileCode2 className="mx-auto mb-3 size-8 text-primary" aria-hidden />
          <h2 className="font-bold">Cuộc thi chưa có đề bài</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Vui lòng liên hệ người tổ chức.
          </p>
        </section>
      ) : (
        <>
          <nav
            aria-label="Chọn đề bài"
            className="flex gap-2 overflow-x-auto pb-1"
          >
            {data.exercises.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                aria-pressed={selectedId === item.id}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold focus-visible:outline-2",
                  selectedId === item.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted",
                )}
              >
                <FileCode2 className="size-4" aria-hidden />
                Bài {index + 1}
                {submittedExerciseIds.includes(item.id) && (
                  <Check className="size-4" aria-label="Đã nộp" />
                )}
                <span className="text-xs opacity-80">{item.points}đ</span>
              </button>
            ))}
          </nav>
          <div className="grid items-start gap-5 xl:grid-cols-2">
            <section className="min-w-0 rounded-2xl border bg-background p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <h2 className="break-words text-xl font-bold text-primary">
                  {exercise.title}
                </h2>
                <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-accent-strong">
                  <Trophy className="size-4" aria-hidden />
                  {exercise.points}đ
                </span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Thời gian: {exercise.timeLimitMs} ms · Bộ nhớ:{" "}
                {Math.round(exercise.memoryLimitKb / 1024)} MB
              </p>
              <div className="mt-6 whitespace-pre-wrap break-words text-sm leading-7">
                {exercise.prompt}
              </div>
              {exercise.testCases.length > 0 && (
                <div className="mt-6 space-y-4">
                  <h3 className="font-bold">Ví dụ</h3>
                  {exercise.testCases.map((testCase, index) => (
                    <div
                      key={testCase.id}
                      className="overflow-hidden rounded-xl border"
                    >
                      <p className="border-b bg-muted px-4 py-2 text-xs font-semibold">
                        Ví dụ {index + 1}
                      </p>
                      <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                        <div className="min-w-0 p-4">
                          <h4 className="text-xs font-semibold text-muted-foreground">
                            Đầu vào
                          </h4>
                          <pre className="mt-2 overflow-x-auto font-mono text-sm">
                            {testCase.input || "(trống)"}
                          </pre>
                        </div>
                        <div className="min-w-0 p-4">
                          <h4 className="text-xs font-semibold text-muted-foreground">
                            Đầu ra
                          </h4>
                          <pre className="mt-2 overflow-x-auto font-mono text-sm">
                            {testCase.expected}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <SolutionPanel
              key={exercise.id}
              exercise={exercise}
              data={data}
              closed={closed || submittedExerciseIds.includes(exercise.id)}
              submitted={submittedExerciseIds.includes(exercise.id)}
              isLast={
                data.exercises.filter(
                  (item) => !submittedExerciseIds.includes(item.id),
                ).length <= 1
              }
              onSubmitted={recordResult}
              onSnapshot={serverDraft.update}
            />
          </div>
        </>
      )}
    </div>
  );
}
