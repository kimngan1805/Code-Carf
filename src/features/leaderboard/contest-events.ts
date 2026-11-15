export interface ContestLeaderboardUpdateEvent {
  contestId: string;
  version: number;
  updatedAt: string;
}

export type ContestLeaderboardListener = (
  event: ContestLeaderboardUpdateEvent,
) => void;

interface ContestLeaderboardBusState {
  listenersByContest: Map<string, Set<ContestLeaderboardListener>>;
  versionsByContest: Map<string, number>;
}

const globalForLeaderboardBus = globalThis as unknown as {
  __codeCarfContestLeaderboardBus?: ContestLeaderboardBusState;
};

function getBus(): ContestLeaderboardBusState {
  if (!globalForLeaderboardBus.__codeCarfContestLeaderboardBus) {
    globalForLeaderboardBus.__codeCarfContestLeaderboardBus = {
      listenersByContest: new Map(),
      versionsByContest: new Map(),
    };
  }
  return globalForLeaderboardBus.__codeCarfContestLeaderboardBus;
}

export function getContestLeaderboardVersion(contestId: string): number {
  return getBus().versionsByContest.get(contestId) ?? 0;
}

/**
 * Publishes an in-memory leaderboard update for a contest within this single Node instance.
 * Must only be called after the grading transaction has committed.
 */
export function emitContestLeaderboardUpdated(
  contestId: string,
): ContestLeaderboardUpdateEvent {
  const bus = getBus();
  const nextVersion = (bus.versionsByContest.get(contestId) ?? 0) + 1;
  bus.versionsByContest.set(contestId, nextVersion);

  const event: ContestLeaderboardUpdateEvent = {
    contestId,
    version: nextVersion,
    updatedAt: new Date().toISOString(),
  };

  const listeners = bus.listenersByContest.get(contestId);
  if (listeners) {
    for (const listener of [...listeners]) {
      try {
        listener(event);
      } catch {
        // Isolate broken subscribers so remaining streams keep receiving updates.
      }
    }
  }

  return event;
}

/** Subscribes to in-memory updates for `contestId` and returns an unsubscribe cleanup callback. */
export function subscribeContestLeaderboard(
  contestId: string,
  listener: ContestLeaderboardListener,
): () => void {
  const bus = getBus();
  let listeners = bus.listenersByContest.get(contestId);
  if (!listeners) {
    listeners = new Set();
    bus.listenersByContest.set(contestId, listeners);
  }
  listeners.add(listener);

  return () => {
    const current = bus.listenersByContest.get(contestId);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) {
      bus.listenersByContest.delete(contestId);
    }
  };
}

export function resetContestLeaderboardBusForTests(): void {
  const bus = getBus();
  bus.listenersByContest.clear();
  bus.versionsByContest.clear();
}
