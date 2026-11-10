"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Check, Loader2, RotateCcw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocalDraft } from "@/hooks/use-local-draft";
import { cn } from "@/lib/utils";
import {
  DEFAULT_LANGUAGE,
  practiceDraftKey,
  practiceLanguageKey,
  resolveLanguage,
  starterFor,
} from "../draft";
import { languages, type SubmissionLanguage } from "../languages";
import { submitPracticeAction } from "../actions";
import type { PracticeSubmissionView } from "../practice-submit";
import { createSingleFlight } from "../single-flight";
import { summaryView } from "../result-view";
import { SubmissionResult } from "./submission-result";

const CodeEditor = dynamic(
  () => import("./code-editor").then((module) => module.CodeEditor),
  {
    ssr: false,
    loading: () => (
      <p className="p-6 text-sm text-muted-foreground">
        Đang tải trình soạn thảo...
      </p>
    ),
  },
);

/**
 * Practice editor: language picker, starter code and a browser-local draft
 * per user + exercise + language, so reloading the page keeps the code.
 */
export function ExerciseWorkspace({
  userId,
  exerciseId,
  maxSourceLength,
}: {
  userId: string;
  exerciseId: string;
  maxSourceLength: number;
}) {
  const { source: savedLanguage, setSource: saveLanguage } = useLocalDraft(
    practiceLanguageKey(userId, exerciseId),
    DEFAULT_LANGUAGE,
  );
  const language = resolveLanguage(savedLanguage);
  const starter = starterFor(language);
  const { source, setSource } = useLocalDraft(
    practiceDraftKey(userId, exerciseId, language),
    starter,
  );
  const [storageFailed, setStorageFailed] = useState(false);
  const [simpleEditor, setSimpleEditor] = useState(false);
  const [flight] = useState(createSingleFlight);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PracticeSubmissionView | null>(null);

  const resultRef = useRef<HTMLDivElement>(null);
  // On desktop (lg) the result is docked under the editor and already on
  // screen. On smaller screens it is below the fold, so bring it into view.
  useEffect(() => {
    if (!result || window.matchMedia("(min-width: 1024px)").matches) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    resultRef.current?.scrollIntoView({
      block: "start",
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [result]);

  async function submit() {
    // The lock flips synchronously, so two fast clicks start one submission.
    await flight.run(async () => {
      setPending(true);
      setError("");
      try {
        const state = await submitPracticeAction(exerciseId, {
          source,
          language,
        });
        if (state.ok) setResult(state.result);
        else setError(state.message);
      } catch {
        setError("Mất kết nối. Vui lòng thử lại.");
      } finally {
        setPending(false);
      }
    });
  }

  const tooLong = source.length > maxSourceLength;

  function updateSource(value: string) {
    setStorageFailed(!setSource(value));
  }

  function changeLanguage(next: SubmissionLanguage) {
    setStorageFailed(!saveLanguage(next));
  }

  const message = error
    ? { text: error, tone: "error" as const }
    : pending
      ? {
          text: "Đang chấm bài, vui lòng đợi trong giây lát...",
          tone: "muted" as const,
        }
      : tooLong
        ? {
            text: "Mã nguồn vượt quá giới hạn 64 KB, hãy rút gọn trước khi nộp.",
            tone: "warn" as const,
          }
        : storageFailed
          ? {
              text: "Không lưu được bản nháp. Hãy sao chép code trước khi rời trang.",
              tone: "warn" as const,
            }
          : {
              text: "Bản nháp được lưu trên trình duyệt này.",
              tone: "muted" as const,
            };

  return (
    <section
      className="flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-background lg:h-full"
      aria-label="Trình soạn thảo bài làm"
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-2.5">
        <label className="flex items-center gap-2 text-sm font-semibold">
          Ngôn ngữ
          <select
            value={language}
            disabled={pending}
            onChange={(event) =>
              changeLanguage(event.target.value as SubmissionLanguage)
            }
            className="h-9 rounded-lg border bg-background px-3 focus-visible:outline-2"
          >
            {languages.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => updateSource(starter)}
            disabled={source === starter || pending}
            title="Khôi phục code mẫu"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 disabled:no-underline disabled:opacity-50"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Code mẫu
            <span className="sr-only">: khôi phục code mẫu</span>
          </button>
          <button
            type="button"
            onClick={() => setSimpleEditor(!simpleEditor)}
            className="text-xs font-semibold text-primary underline underline-offset-4 focus-visible:outline-2"
          >
            {simpleEditor ? "Editor nâng cao" : "Editor đơn giản"}
          </button>
        </div>
      </div>
      <div className="h-[22rem] shrink-0 lg:h-auto lg:min-h-40 lg:flex-1 lg:shrink">
        {simpleEditor ? (
          <textarea
            aria-label="Mã nguồn"
            spellCheck={false}
            value={source}
            readOnly={pending}
            onChange={(event) => updateSource(event.target.value)}
            className="block h-full w-full resize-none bg-background p-4 font-mono text-sm focus-visible:outline-2"
          />
        ) : (
          <CodeEditor
            key={language}
            value={source}
            onChange={updateSource}
            language={language}
            readOnly={pending}
            height="100%"
          />
        )}
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
        <p
          role={message.tone === "error" ? "alert" : undefined}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-1.5 text-xs",
            message.tone === "error" && "font-semibold text-destructive",
            message.tone === "warn" && "text-warning",
            message.tone === "muted" && "text-muted-foreground",
          )}
        >
          <Check className="size-3.5 shrink-0" aria-hidden />
          {message.text}
        </p>
        <Button
          onClick={() => void submit()}
          disabled={pending || !source.trim() || tooLong}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Send className="size-4" aria-hidden />
          )}
          {pending ? "Đang chấm..." : "Nộp bài"}
        </Button>
      </div>
      <div role="status" aria-live="polite" className="sr-only">
        {pending
          ? "Đang chấm bài"
          : result
            ? `Đã chấm xong: ${summaryView(result.status).title}, ${result.score}/${result.maxScore} điểm`
            : ""}
      </div>
      {result && (
        <div
          ref={resultRef}
          className="scroll-mt-20 border-t lg:max-h-[45%] lg:min-h-24 lg:overflow-y-auto"
        >
          <SubmissionResult result={result} onDismiss={() => setResult(null)} />
        </div>
      )}
    </section>
  );
}
