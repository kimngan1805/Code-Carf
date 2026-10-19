"use client";
import { useEffect, useState } from "react";
import { estimateServerTime } from "../clock";

export function useServerClock(
  slug: string,
  initialNow: number,
  initialEndsAt: number,
) {
  const [now, setNow] = useState(initialNow);
  const [endsAt, setEndsAt] = useState(initialEndsAt);
  const [blocked, setBlocked] = useState(false);
  const [connectionLost, setConnectionLost] = useState(false);

  useEffect(() => {
    let anchor = initialNow;
    let sampledAt = performance.now();
    let inFlight = false;
    let stopped = false;
    const controller = new AbortController();
    async function sync() {
      if (inFlight || stopped) return;
      inFlight = true;
      const sentAt = performance.now();
      try {
        const response = await fetch(
          `/api/contests/${encodeURIComponent(slug)}/clock`,
          { cache: "no-store", signal: controller.signal },
        );
        const result = await response.json();
        if (stopped) return;
        if ([401, 403, 404].includes(response.status)) {
          setBlocked(true);
          return;
        }
        if (!response.ok || !Number.isFinite(result.data?.serverNow))
          throw new Error("Clock unavailable");
        const deadline = Date.parse(result.data.endsAt);
        if (!Number.isFinite(deadline)) throw new Error("Invalid deadline");
        sampledAt = performance.now();
        // Approximate one-way transit time from the round trip.
        anchor = result.data.serverNow + (sampledAt - sentAt) / 2;
        setNow(anchor);
        setEndsAt(deadline);
        setBlocked(false);
        setConnectionLost(false);
      } catch {
        if (!stopped) setConnectionLost(true);
      } finally {
        inFlight = false;
      }
    }
    const tick = window.setInterval(
      () => setNow(estimateServerTime(anchor, sampledAt, performance.now())),
      250,
    );
    const poll = window.setInterval(() => {
      void sync();
    }, 15000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void sync();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", sync);
    void sync();
    return () => {
      stopped = true;
      controller.abort();
      window.clearInterval(tick);
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", sync);
    };
  }, [slug, initialNow]);
  return { now, endsAt, blocked, connectionLost };
}
