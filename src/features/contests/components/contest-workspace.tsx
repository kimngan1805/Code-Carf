"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Clock3,
  FileCode2,
  Send,
  Trophy,
} from "lucide-react";
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
import { useContestDraft } from "./use-contest-draft";
import { useServerDraft } from "./use-server-draft";
import { useContestFinalization } from "./use-contest-finalization";
import { FinalizationNotice } from "./expired-contest";
import type { ContestDraftInput } from "../draft-schema";

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
type HistoryEntry = ContestWorkspaceData["submissions"][number];

function SolutionPanel({
  exercise,
  data,
  closed,
  onSubmitted,
  onSnapshot,
}: {
  exercise: Exercise;
  data: ContestWorkspaceData;
  closed: boolean;
  onSubmitted: (result: ContestSubmissionResult, language: string) => void;
  onSnapshot: (snapshot: ContestDraftInput) => void;
}) {
  const [language, setLanguage] = useState<SolutionLanguage>("python");
  const selected = languages.find((item) => item.id === language)!;
  const { source, setSource } = useContestDraft(
    draftKey(data.userId, data.contest.id, exercise.id, language),
    selected.starter,
  );
  const [pending, setPending] = useState(false);
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
    if (inFlight.current || closed) return;
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
      if (!response.ok)
        throw new Error(result.error?.message ?? "Không thể nộp bài.");
      onSubmitted(result.data, language);
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
          readOnly={closed}
          onChange={(event) => updateSource(event.target.value)}
          className="block min-h-96 w-full resize-y bg-background p-4 font-mono text-sm focus-visible:outline-2"
        />
      ) : (
        <CodeEditor
          value={source}
          onChange={updateSource}
          language={language}
          readOnly={closed}
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
            onClick={submit}
            disabled={
              closed ||
              pending ||
              !source.trim() ||
              source.length > data.maxSourceLength
            }
          >
            <Send className="size-4" aria-hidden />
            {pending ? "Đang nộp..." : "Nộp bài"}
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
    </section>
  );
}

const resultLabels: Record<string, string> = {
  MOCKED: "Đã chấm · mô phỏng",
  PENDING: "Chờ chấm",
  RUNNING: "Đang chấm",
  ACCEPTED: "Đúng",
  REJECTED: "Chưa đúng",
  ERROR: "Lỗi chấm",
  NEEDS_REVIEW: "Chờ duyệt",
};

export function ContestWorkspace({ data }: { data: ContestWorkspaceData }) {
  const [selectedId, setSelectedId] = useState(data.exercises[0]?.id ?? "");
  const [history, setHistory] = useState<HistoryEntry[]>(data.submissions);
  const clock = useServerClock(
    data.contest.slug,
    data.serverNow,
    Date.parse(data.contest.deadlineAt),
  );
  const remaining = clock.deadlineAt - clock.now;
  const closed = clock.blocked || remaining <= 0;
  const serverDraft = useServerDraft(data.contest.slug, closed);
  const finalization = useContestFinalization(
    data.contest.slug,
    remaining <= 0,
  );
  const visibleHistory = finalization.result?.submission
    ? [
        finalization.result.submission,
        ...history.filter(
          (item) => item.id !== finalization.result?.submission?.id,
        ),
      ].slice(0, 20)
    : history;
  const exercise = data.exercises.find((item) => item.id === selectedId);
  function recordResult(result: ContestSubmissionResult, language: string) {
    setHistory((previous) =>
      [
        {
          id: result.id,
          exerciseId: result.exerciseId,
          language,
          status: result.status,
          score: result.score,
          autoSubmitted: false,
          feedback: result.feedback,
          createdAt: result.createdAt,
        },
        ...previous,
      ].slice(0, 20),
    );
  }
  return (
    <div className="mx-auto max-w-screen-2xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-background p-5">
        <div className="min-w-0">
          <Link
            href={`/contests/${data.contest.slug}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary focus-visible:outline-2"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Chi tiết cuộc thi
          </Link>
          <h1 className="mt-2 break-words text-xl font-bold">
            {data.contest.title}
          </h1>
        </div>
        <div
          className={cn(
            "rounded-xl px-5 py-3 text-center",
            closed
              ? "bg-destructive/10 text-destructive"
              : remaining < 300000
                ? "bg-warning/10 text-warning"
                : "bg-secondary/50 text-primary",
          )}
        >
          <p className="mb-1 flex items-center justify-center gap-2 text-xs font-semibold">
            <Clock3 className="size-3.5" aria-hidden />
            THỜI GIAN LÀM BÀI CỦA BẠN
          </p>
          <p role="timer" className="font-mono text-2xl font-bold tabular-nums">
            {formatDuration(remaining)}
          </p>
        </div>
      </header>
      {remaining <= 0 && <FinalizationNotice finalization={finalization} />}
      {!closed && (
        <p
          role="status"
          className={cn(
            "text-xs",
            serverDraft.state === "error"
              ? "text-warning"
              : "text-muted-foreground",
          )}
        >
          {serverDraft.state === "saved"
            ? "Đã đồng bộ bài đang mở. Khi hết giờ, bản đã đồng bộ sẽ được tự nộp."
            : serverDraft.state === "error"
              ? "Chưa đồng bộ được bài đang mở. Hãy kiểm tra kết nối; tự nộp sẽ dùng bản đã đồng bộ gần nhất."
              : "Đang đồng bộ bài đang mở..."}
        </p>
      )}
      {closed && (
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
              closed={closed}
              onSubmitted={recordResult}
              onSnapshot={serverDraft.update}
            />
          </div>
        </>
      )}
      <section className="overflow-hidden rounded-2xl border bg-background">
        <h2 className="border-b px-5 py-4 font-bold">
          Bài nộp gần đây của bạn
        </h2>
        {visibleHistory.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">
            Bạn chưa nộp bài nào trong cuộc thi này.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-5 py-3">
                    Bài
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Ngôn ngữ
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Trạng thái
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Điểm
                  </th>
                  <th scope="col" className="px-5 py-3">
                    Thời gian
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {visibleHistory.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-3">
                      {data.exercises.find(
                        (entry) => entry.id === item.exerciseId,
                      )?.title ?? "Bài thi"}
                      {item.autoSubmitted && (
                        <span className="ml-2 rounded-full bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground">
                          Tự nộp
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {languages.find((entry) => entry.id === item.language)
                        ?.label ?? item.language}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        title={item.feedback ?? undefined}
                        className={cn(
                          "font-semibold",
                          item.status === "ACCEPTED"
                            ? "text-success"
                            : "text-primary",
                        )}
                      >
                        {item.feedback?.toLowerCase().includes("mock") ||
                        item.feedback?.includes("mô phỏng")
                          ? resultLabels.MOCKED
                          : (resultLabels[item.status] ?? item.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3">{item.score ?? "—"}</td>
                    <td className="whitespace-nowrap px-5 py-3">
                      {new Intl.DateTimeFormat("vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      }).format(new Date(item.createdAt))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
