"use client";

import { useEffect, useState } from "react";
import { createEventReporter } from "../reporter";
import type { ViolationStatus } from "../rules";

export function useContestEvents(
  slug: string,
  enabled: boolean,
  initial: ViolationStatus,
) {
  const [status, setStatus] = useState(initial);
  const [lastEvent, setLastEvent] = useState<"TAB_SWITCH" | "PASTE" | null>(
    null,
  );
  const [connectionLost, setConnectionLost] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    const url = `/api/contests/${encodeURIComponent(slug)}/proctoring-events`;
    function acceptStatus(next: ViolationStatus) {
      if (stopped) return;
      setStatus((previous) =>
        next.violationCount < previous.violationCount
          ? previous
          : { ...next, flagged: previous.flagged || next.flagged },
      );
      setConnectionLost(false);
    }
    async function sync() {
      try {
        const response = await fetch(url, {
          cache: "no-store",
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) throw new Error("Status unavailable");
        acceptStatus((await response.json()).data);
      } catch {
        if (!stopped) setConnectionLost(true);
      }
    }
    const report = createEventReporter(async (event) => {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(event),
          keepalive: true,
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) {
          void sync();
          return;
        }
        acceptStatus((await response.json()).data.status);
      } catch {
        if (!stopped) setConnectionLost(true);
      }
    });
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        setLastEvent("TAB_SWITCH");
        report("TAB_SWITCH");
      } else void sync();
    };
    const onPaste = (event: ClipboardEvent) => {
      setLastEvent("PASTE");
      report("PASTE", event.clipboardData?.getData("text").length ?? 0);
    };
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("paste", onPaste, { capture: true });
    void sync();
    const poll = window.setInterval(() => void sync(), 15000);
    return () => {
      stopped = true;
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("paste", onPaste, { capture: true });
    };
  }, [slug, enabled]);
  return { status, lastEvent, connectionLost };
}
