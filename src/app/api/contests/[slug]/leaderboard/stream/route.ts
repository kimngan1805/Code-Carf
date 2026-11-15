import {
  assertContestLeaderboardViewer,
  loadContestLeaderboardSnapshot,
} from "@/features/leaderboard/contest-leaderboard";
import { subscribeContestLeaderboard } from "@/features/leaderboard/contest-events";
import { fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

const HEARTBEAT_INTERVAL_MS = 15_000;
const COALESCE_MS = 120;

function formatSseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  let viewer;
  try {
    const { slug } = await params;
    viewer = await assertContestLeaderboardViewer(slug);
  } catch (error) {
    const response = fail(error);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let inFlight = false;
      let pendingResync = false;
      let debounceTimer: ReturnType<typeof setTimeout> | null = null;
      let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
      let unsubscribe = () => {};

      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };

      const pushSnapshot = async () => {
        if (closed) return;
        if (inFlight) {
          pendingResync = true;
          return;
        }
        inFlight = true;
        try {
          do {
            pendingResync = false;
            const snapshot = await loadContestLeaderboardSnapshot(viewer);
            if (closed) break;
            safeEnqueue(formatSseEvent("leaderboard", snapshot));
          } while (pendingResync && !closed);
        } catch {
          // Drop failed tick safely; client polling/reconnect handles recovery.
        } finally {
          inFlight = false;
        }
      };

      const schedulePush = () => {
        if (closed || debounceTimer) return;
        debounceTimer = setTimeout(() => {
          debounceTimer = null;
          void pushSnapshot();
        }, COALESCE_MS);
      };

      cleanup = () => {
        if (closed) return;
        closed = true;
        if (debounceTimer) {
          clearTimeout(debounceTimer);
          debounceTimer = null;
        }
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }
        unsubscribe();
        request.signal.removeEventListener("abort", cleanup);
        try {
          controller.close();
        } catch {
          // Stream may already be closed.
        }
      };

      request.signal.addEventListener("abort", cleanup);
      unsubscribe = subscribeContestLeaderboard(
        viewer.contest.id,
        schedulePush,
      );
      heartbeatTimer = setInterval(() => {
        safeEnqueue(": ping\n\n");
      }, HEARTBEAT_INTERVAL_MS);

      void pushSnapshot();
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
