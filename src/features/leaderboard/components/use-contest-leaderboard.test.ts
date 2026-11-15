import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ContestLeaderboardData } from "@/features/leaderboard/contest-leaderboard";

const hooks = vi.hoisted(() => ({
  stateCursor: 0,
  refCursor: 0,
  states: [] as unknown[],
  refs: [] as Array<{ current: unknown }>,
  effects: [] as Array<() => void | (() => void)>,
}));

vi.mock("react", () => ({
  useState: (initial: unknown) => {
    const index = hooks.stateCursor++;
    if (!(index in hooks.states)) {
      hooks.states[index] =
        typeof initial === "function" ? (initial as () => unknown)() : initial;
    }
    return [
      hooks.states[index],
      (value: unknown) => {
        hooks.states[index] =
          typeof value === "function"
            ? (value as (prev: unknown) => unknown)(hooks.states[index])
            : value;
      },
    ];
  },
  useRef: (initial: unknown) => {
    const index = hooks.refCursor++;
    if (!(index in hooks.refs)) {
      hooks.refs[index] = { current: initial };
    }
    return hooks.refs[index];
  },
  useCallback: (fn: unknown) => fn,
  useEffect: (run: () => void | (() => void)) => {
    hooks.effects.push(run);
  },
}));

import {
  CONTEST_LEADERBOARD_POLL_INTERVAL_MS,
  CONTEST_LEADERBOARD_RECONNECT_BACKOFF_MS,
  useContestLeaderboard,
} from "./use-contest-leaderboard";

function makeSnapshot(version: number, score = 100): ContestLeaderboardData {
  return {
    contest: {
      id: "c-1",
      slug: "sample-contest",
      title: "Sample Contest",
      status: "PUBLISHED",
      penaltyMinutes: 20,
      examStartsAt: null,
      examEndsAt: null,
      exerciseCount: 2,
    },
    version,
    updatedAt: "2026-11-15T10:00:00.000Z",
    entries: [
      {
        rank: 1,
        userId: "u-1",
        name: "Minh Thư",
        score,
        penaltyMinutes: 0,
        finished: false,
        isCurrentUser: true,
      },
    ],
    totalParticipants: 1,
    myStanding: {
      userId: "u-1",
      name: "Minh Thư",
      score,
      penaltyMinutes: 0,
      rank: 1,
      inTop: true,
    },
  };
}

class MockEventSource {
  static instances: MockEventSource[] = [];
  readonly url: string;
  onopen: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  closed = false;
  private listeners = new Map<
    string,
    Array<(event: MessageEvent<string>) => void>
  >();

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(
    type: string,
    handler: (event: MessageEvent<string>) => void,
  ) {
    const existing = this.listeners.get(type) ?? [];
    existing.push(handler);
    this.listeners.set(type, existing);
  }

  close() {
    this.closed = true;
  }

  emitOpen() {
    this.onopen?.(new Event("open"));
  }

  emitError() {
    this.onerror?.(new Event("error"));
  }

  emitLeaderboard(payload: ContestLeaderboardData) {
    const handlers = this.listeners.get("leaderboard") ?? [];
    const event = new MessageEvent("leaderboard", {
      data: JSON.stringify(payload),
    });
    for (const handler of handlers) {
      handler(event);
    }
  }
}

const fetchMock = vi.fn();
let documentEvents: EventTarget;
let cleanups: Array<() => void> = [];

function resetHarness() {
  for (const fn of cleanups) fn();
  cleanups = [];
  hooks.states.length = 0;
  hooks.refs.length = 0;
  hooks.effects.length = 0;
  hooks.stateCursor = 0;
  hooks.refCursor = 0;
}

function flushMountedEffects() {
  for (const run of hooks.effects) {
    const cleanup = run();
    if (typeof cleanup === "function") {
      cleanups.push(cleanup);
    }
  }
  hooks.effects.length = 0;
}

function readSnapshotState() {
  return {
    data: hooks.states[0] as ContestLeaderboardData | null,
    status: hooks.states[1] as string,
    error: hooks.states[2] as string | null,
  };
}

function setVisibility(state: "visible" | "hidden") {
  Object.defineProperty(documentEvents, "visibilityState", {
    value: state,
    configurable: true,
  });
  documentEvents.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  vi.useFakeTimers();
  MockEventSource.instances = [];
  fetchMock.mockReset();
  resetHarness();

  documentEvents = new EventTarget();
  Object.defineProperty(documentEvents, "visibilityState", {
    value: "visible",
    configurable: true,
  });

  vi.stubGlobal("document", documentEvents);
  vi.stubGlobal("EventSource", MockEventSource);
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  resetHarness();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useContestLeaderboard", () => {
  it("receives live SSE updates in realtime mode without reload", () => {
    useContestLeaderboard({
      slug: "sample-contest",
      initialData: makeSnapshot(0, 100),
    });
    flushMountedEffects();

    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0].url).toBe(
      "/api/contests/sample-contest/leaderboard/stream",
    );

    MockEventSource.instances[0].emitOpen();
    MockEventSource.instances[0].emitLeaderboard(makeSnapshot(1, 200));

    const current = readSnapshotState();
    expect(current.status).toBe("realtime");
    expect(current.data?.version).toBe(1);
    expect(current.data?.entries[0]?.score).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("switches to immediate snapshot fetch + 2000ms polling on SSE error and restores realtime after backoff reconnect", async () => {
    fetchMock.mockImplementation(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: makeSnapshot(2, 150), error: null }),
    }));

    useContestLeaderboard({
      slug: "sample-contest",
      initialData: makeSnapshot(0, 100),
    });
    flushMountedEffects();

    const firstSource = MockEventSource.instances[0];
    firstSource.emitError();
    await vi.advanceTimersByTimeAsync(0);

    expect(firstSource.closed).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/contests/sample-contest/leaderboard",
      expect.objectContaining({ method: "GET", cache: "no-store" }),
    );
    expect(readSnapshotState().status).toBe("polling");
    expect(readSnapshotState().data?.entries[0]?.score).toBe(150);

    // Next poll runs after 2000ms
    await vi.advanceTimersByTimeAsync(CONTEST_LEADERBOARD_POLL_INTERVAL_MS);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Backoff reconnect fires at 5000ms
    await vi.advanceTimersByTimeAsync(
      CONTEST_LEADERBOARD_RECONNECT_BACKOFF_MS[0] -
        CONTEST_LEADERBOARD_POLL_INTERVAL_MS,
    );
    expect(MockEventSource.instances).toHaveLength(2);

    MockEventSource.instances[1].emitOpen();
    expect(readSnapshotState().status).toBe("realtime");

    // Polling should stop once SSE recovers
    const callsAtRecovery = fetchMock.mock.calls.length;
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fetchMock).toHaveBeenCalledTimes(callsAtRecovery);
  });

  it("pauses SSE and timers when tab becomes hidden and resumes on visible", async () => {
    fetchMock.mockImplementation(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: makeSnapshot(3, 180), error: null }),
    }));

    useContestLeaderboard({
      slug: "sample-contest",
      initialData: makeSnapshot(0, 100),
    });
    flushMountedEffects();

    const source = MockEventSource.instances[0];
    setVisibility("hidden");
    expect(source.closed).toBe(true);

    setVisibility("visible");
    await vi.advanceTimersByTimeAsync(0);

    expect(MockEventSource.instances).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("stops permanently with disconnected status on 401/403/404 snapshot responses", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        data: null,
        error: { message: "Không có quyền xem bảng xếp hạng" },
      }),
    });

    useContestLeaderboard({
      slug: "sample-contest",
      initialData: makeSnapshot(0, 100),
    });
    flushMountedEffects();

    MockEventSource.instances[0].emitError();
    await vi.advanceTimersByTimeAsync(0);

    const current = readSnapshotState();
    expect(current.status).toBe("disconnected");
    expect(current.error).toContain("Không có quyền");

    await vi.advanceTimersByTimeAsync(15_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(MockEventSource.instances).toHaveLength(1);
  });

  it("cleans up SSE on disable and reconnects with a fresh snapshot when re-enabled", async () => {
    fetchMock.mockImplementation(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: makeSnapshot(4, 220), error: null }),
    }));

    useContestLeaderboard({
      slug: "sample-contest",
      enabled: true,
    });
    flushMountedEffects();

    expect(MockEventSource.instances).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(0);
    expect(readSnapshotState().data?.entries[0]?.score).toBe(220);

    // Leaving tab disables the hook -> runs effect cleanup and closes EventSource.
    for (const fn of cleanups) fn();
    cleanups = [];
    expect(MockEventSource.instances[0].closed).toBe(true);

    // Re-opening tab creates a new EventSource and fetches a fresh snapshot.
    fetchMock.mockImplementation(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: makeSnapshot(5, 250), error: null }),
    }));

    hooks.stateCursor = 0;
    hooks.refCursor = 0;
    useContestLeaderboard({
      slug: "sample-contest",
      enabled: true,
    });
    flushMountedEffects();

    expect(MockEventSource.instances).toHaveLength(2);
    expect(MockEventSource.instances[1].closed).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(0);
    expect(readSnapshotState().data?.entries[0]?.score).toBe(250);
  });

  it("isolates standings per contest slug so switching contests never mixes data", () => {
    useContestLeaderboard({
      slug: "contest-a",
      initialData: makeSnapshot(1, 300),
    });
    flushMountedEffects();

    MockEventSource.instances[0].emitOpen();
    MockEventSource.instances[0].emitLeaderboard({
      ...makeSnapshot(2, 300),
      contest: {
        ...makeSnapshot(2, 300).contest,
        id: "c-a",
        slug: "contest-a",
        title: "Contest A",
      },
    });

    hooks.stateCursor = 0;
    hooks.refCursor = 0;
    const otherContest = useContestLeaderboard({
      slug: "contest-b",
      enabled: true,
    });

    expect(otherContest.data).toBeNull();
  });
});
