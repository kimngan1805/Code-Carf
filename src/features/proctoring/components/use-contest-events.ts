"use client";

import { useEffect } from "react";
import { createEventReporter } from "../reporter";

export function useContestEvents(slug: string, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const report = createEventReporter(async (event) => {
      await fetch(
        `/api/contests/${encodeURIComponent(slug)}/proctoring-events`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(event),
          keepalive: true,
          signal: AbortSignal.timeout(5000),
        },
      );
    });
    const onVisibility = () => {
      if (document.visibilityState === "hidden") report("TAB_SWITCH");
    };
    const onPaste = (event: ClipboardEvent) =>
      report("PASTE", event.clipboardData?.getData("text").length ?? 0);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("paste", onPaste, true);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("paste", onPaste, true);
    };
  }, [slug, enabled]);
}
