"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ContestLeaderboardData } from "@/features/leaderboard/contest-leaderboard";

export type ContestLeaderboardConnectionStatus =
  "realtime" | "polling" | "disconnected";

export const CONTEST_LEADERBOARD_POLL_INTERVAL_MS = 2000;
export const CONTEST_LEADERBOARD_RECONNECT_BACKOFF_MS = [
  5000, 10000, 20000, 30000,
] as const;

const TERMINAL_HTTP_STATUSES = new Set([401, 403, 404]);

interface UseContestLeaderboardOptions {
  slug: string;
  initialData?: ContestLeaderboardData | null;
  enabled?: boolean;
}

export interface UseContestLeaderboardResult {
  data: ContestLeaderboardData | null;
  status: ContestLeaderboardConnectionStatus;
  error: string | null;
  isRefreshing: boolean;
  lastUpdatedAt: string | null;
  refreshNow: () => Promise<void>;
}

function getApiUrl(slug: string): string {
  return `/api/contests/${encodeURIComponent(slug)}/leaderboard`;
}

function getStreamUrl(slug: string): string {
  return `/api/contests/${encodeURIComponent(slug)}/leaderboard/stream`;
}

/**
 * Keeps contest leaderboard standings live via SSE (`EventSource`), falling back
 * to 2-second HTTP polling with exponential-backoff SSE reconnection on failure,
 * and pausing active connections when the browser tab is hidden.
 */
export function useContestLeaderboard({
  slug,
  initialData = null,
  enabled = true,
}: UseContestLeaderboardOptions): UseContestLeaderboardResult {
  const [data, setData] = useState<ContestLeaderboardData | null>(initialData);
  const [status, setStatus] =
    useState<ContestLeaderboardConnectionStatus>("realtime");
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const manualRefreshRef = useRef<(() => Promise<void>) | null>(null);
  const needsInitialFetch = initialData === null;

  useEffect(() => {
    if (!enabled) {
      manualRefreshRef.current = null;
      return;
    }

    let disposed = false;
    let terminalStop = false;
    let reconnectAttempt = 0;
    let deliverySeq = 0;
    let eventSource: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let fetchAbort: AbortController | null = null;

    const clearPollTimer = () => {
      if (pollTimer !== null) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const clearReconnectTimer = () => {
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const closeEventSource = () => {
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };

    const stopAll = () => {
      closeEventSource();
      clearPollTimer();
      clearReconnectTimer();
      fetchAbort?.abort();
      fetchAbort = null;
    };

    const fetchSnapshot = async (manual = false) => {
      if (disposed || terminalStop) {
        return;
      }

      fetchAbort?.abort();
      const controller = new AbortController();
      fetchAbort = controller;
      const startedSeq = ++deliverySeq;

      try {
        const response = await fetch(getApiUrl(slug), {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        const payload = (await response.json().catch(() => null)) as {
          data?: ContestLeaderboardData | null;
          error?: { message?: string } | null;
        } | null;

        if (disposed || controller.signal.aborted) {
          return;
        }

        if (!response.ok || !payload?.data) {
          const message =
            payload?.error?.message ?? "Không thể tải bảng xếp hạng cuộc thi.";
          setError(message);

          if (TERMINAL_HTTP_STATUSES.has(response.status)) {
            terminalStop = true;
            stopAll();
            setStatus("disconnected");
            return;
          }

          setStatus("disconnected");
          return;
        }

        // Ignore if a newer SSE update landed while this fetch was in flight.
        if (deliverySeq === startedSeq) {
          setData(payload.data);
        }
        setError(null);
        setStatus((current) =>
          eventSource
            ? current === "disconnected"
              ? "polling"
              : current
            : "polling",
        );
      } catch (err) {
        if (
          disposed ||
          controller.signal.aborted ||
          (err instanceof DOMException && err.name === "AbortError")
        ) {
          return;
        }
        setError("Mất kết nối tới máy chủ bảng xếp hạng.");
        setStatus("disconnected");
      } finally {
        if (manual && !disposed) {
          setIsRefreshing(false);
        }
      }
    };

    const scheduleReconnect = () => {
      if (
        disposed ||
        terminalStop ||
        reconnectTimer !== null ||
        (typeof document !== "undefined" &&
          document.visibilityState === "hidden")
      ) {
        return;
      }
      const delay =
        CONTEST_LEADERBOARD_RECONNECT_BACKOFF_MS[
          Math.min(
            reconnectAttempt,
            CONTEST_LEADERBOARD_RECONNECT_BACKOFF_MS.length - 1,
          )
        ];
      reconnectAttempt += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connectStream();
      }, delay);
    };

    const startPollingFallback = (withReconnect: boolean) => {
      if (disposed || terminalStop) {
        return;
      }

      setStatus("polling");

      if (pollTimer === null) {
        pollTimer = setInterval(() => {
          void fetchSnapshot(false);
        }, CONTEST_LEADERBOARD_POLL_INTERVAL_MS);
      }

      void fetchSnapshot(false);
      if (withReconnect) {
        scheduleReconnect();
      }
    };

    function connectStream() {
      if (
        disposed ||
        terminalStop ||
        (typeof document !== "undefined" &&
          document.visibilityState === "hidden")
      ) {
        return;
      }

      if (typeof EventSource === "undefined") {
        startPollingFallback(false);
        return;
      }

      closeEventSource();
      clearReconnectTimer();

      const source = new EventSource(getStreamUrl(slug));
      eventSource = source;

      source.onopen = () => {
        if (disposed || eventSource !== source) {
          return;
        }
        reconnectAttempt = 0;
        clearPollTimer();
        clearReconnectTimer();
        setError(null);
        setStatus("realtime");
      };

      source.addEventListener("leaderboard", (event: MessageEvent<string>) => {
        if (disposed || eventSource !== source) {
          return;
        }
        try {
          const parsed = JSON.parse(event.data) as ContestLeaderboardData;
          deliverySeq += 1;
          reconnectAttempt = 0;
          clearPollTimer();
          clearReconnectTimer();
          setData(parsed);
          setError(null);
          setStatus("realtime");
        } catch {
          // Ignore malformed payloads; next event or manual refresh will recover.
        }
      });

      source.onerror = () => {
        if (disposed || eventSource !== source) {
          return;
        }
        closeEventSource();
        startPollingFallback(true);
      };
    }

    manualRefreshRef.current = async () => {
      if (disposed) return;
      terminalStop = false;
      setIsRefreshing(true);
      await fetchSnapshot(true);
      if (!disposed && !terminalStop && !eventSource) {
        reconnectAttempt = 0;
        connectStream();
      }
    };

    const handleVisibilityChange = () => {
      if (disposed || terminalStop) {
        return;
      }
      if (document.visibilityState === "hidden") {
        stopAll();
        return;
      }
      reconnectAttempt = 0;
      void fetchSnapshot(false);
      connectStream();
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    if (
      typeof document === "undefined" ||
      document.visibilityState !== "hidden"
    ) {
      connectStream();
      if (needsInitialFetch) {
        void fetchSnapshot(false);
      }
    }

    return () => {
      disposed = true;
      manualRefreshRef.current = null;
      if (typeof document !== "undefined") {
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange,
        );
      }
      stopAll();
    };
  }, [slug, enabled, needsInitialFetch]);

  const refreshNow = useCallback(async () => {
    await manualRefreshRef.current?.();
  }, []);

  const scopedData = data?.contest.slug === slug ? data : null;
  const scopedInitialData =
    initialData?.contest.slug === slug ? initialData : null;
  const currentData = scopedData ?? scopedInitialData;

  return {
    data: currentData,
    status,
    error,
    isRefreshing,
    lastUpdatedAt: currentData?.updatedAt ?? null,
    refreshNow,
  };
}
