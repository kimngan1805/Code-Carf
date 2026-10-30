"use client";
import { useEffect, useState } from "react";
import type { ContestFinalization } from "../deadline";

export function useContestFinalization(slug: string, enabled: boolean) {
  const [result, setResult] = useState<ContestFinalization | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let running = false;
    let finished = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function send() {
      if (stopped || running || finished) return;
      running = true;
      let retry = true;
      try {
        const response = await fetch(
          `/api/contests/${encodeURIComponent(slug)}/finalize`,
          { method: "POST", signal: controller.signal },
        );
        const body = await response.json();
        if (stopped) return;
        if (!response.ok) {
          retry =
            response.status >= 500 || body.error?.code === "CONTEST_NOT_ENDED";
          throw new Error(
            body.error?.message ?? "Chưa thể xác nhận bài tự nộp.",
          );
        }
        const next = body.data as ContestFinalization;
        setResult(next);
        setError("");
        retry =
          !!next.submission &&
          ["PENDING", "RUNNING"].includes(next.submission.status);
        finished = !retry;
      } catch (failure) {
        if (stopped) return;
        if (!(failure instanceof Error) || failure.name !== "AbortError") {
          setError(
            failure instanceof Error
              ? failure.message
              : "Mất kết nối. Hệ thống sẽ thử lại.",
          );
          // A failed network response is safe to retry: the server stores the final submission ID.
          if (failure instanceof TypeError) retry = true;
        }
      } finally {
        running = false;
        if (retry && !stopped)
          timer = setTimeout(() => {
            void send();
          }, 2000);
      }
    }
    const onOnline = () => {
      clearTimeout(timer);
      void send();
    };
    timer = setTimeout(() => {
      void send();
    }, 0);
    window.addEventListener("online", onOnline);
    return () => {
      stopped = true;
      controller.abort();
      clearTimeout(timer);
      window.removeEventListener("online", onOnline);
    };
  }, [enabled, slug]);
  return { result, error };
}
