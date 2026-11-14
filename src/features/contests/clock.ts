/** Advance a server timestamp using a monotonic clock, never the device's wall clock. */
export function estimateServerTime(
  serverNow: number,
  sampledAt: number,
  monotonicNow: number,
) {
  return serverNow + Math.max(0, monotonicNow - sampledAt);
}

export function draftKey(
  userId: string,
  contestId: string,
  exerciseId: string,
  language: string,
) {
  return `code-carf:contest-draft:${userId}:${contestId}:${exerciseId}:${language}`;
}
