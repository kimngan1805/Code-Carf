"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
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
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 disabled:no-underline disabled:opacity-50"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            Khôi phục code mẫu
          </button>
          <button
            type="button"
            onClick={() => setSimpleEditor(!simpleEditor)}
            className="text-xs font-semibold text-primary underline underline-offset-4 focus-visible:outline-2"
          >
            {simpleEditor ? "Dùng editor nâng cao" : "Dùng editor đơn giản"}
          </button>
        </div>
      </div>
      {simpleEditor ? (
        <textarea
          aria-label="Mã nguồn"
          spellCheck={false}
          value={source}
          readOnly={pending}
          onChange={(event) => updateSource(event.target.value)}
          className="block h-[480px] w-full resize-y bg-background p-4 font-mono text-sm focus-visible:outline-2"
        />
      ) : (
        <CodeEditor
          key={language}
          value={source}
          onChange={updateSource}
          language={language}
          readOnly={pending}
          height="480px"
        />
      )}
      <div className="space-y-3 border-t p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p
            className={cn(
              "flex items-center gap-1.5 text-xs",
              storageFailed || tooLong
                ? "text-warning"
                : "text-muted-foreground",
            )}
          >
            <Check className="size-3.5" aria-hidden />
            {tooLong
              ? "Mã nguồn vượt quá giới hạn 64 KB, hãy rút gọn trước khi nộp."
              : storageFailed
                ? "Không lưu được bản nháp. Hãy sao chép code trước khi rời trang."
                : "Bản nháp được lưu trên trình duyệt này."}
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
        <div role="status" aria-live="polite">
          {pending && (
            <p className="text-sm text-muted-foreground">
              Đang chấm bài, vui lòng đợi trong giây lát...
            </p>
          )}
        </div>
        {error && (
          <p role="alert" className="text-sm font-semibold text-destructive">
            {error}
          </p>
        )}
      </div>
      {result && <SubmissionResult result={result} />}
    </section>
  );
}
