import type { ProctoringEventInput } from "./schema";

export function createEventReporter(
  send: (event: ProctoringEventInput) => Promise<unknown>,
  clock = Date.now,
  makeId = () => crypto.randomUUID(),
) {
  const recent: number[] = [];
  const last = new Map<string, number>();
  return (type: ProctoringEventInput["type"], pasteLength = 0) => {
    try {
      const now = clock();
      while (recent.length && recent[0] <= now - 60_000) recent.shift();
      if (recent.length >= 20 || now - (last.get(type) ?? -Infinity) < 1000)
        return;
      last.set(type, now);
      recent.push(now);
      const event: ProctoringEventInput = {
        clientEventId: makeId(),
        occurredAt: new Date(now).toISOString(),
        ...(type === "PASTE"
          ? { type, pasteLength: Math.min(2_000_000, Math.max(0, pasteLength)) }
          : { type }),
      };
      // Logging must never block editing, pasting, submitting or show an unhandled rejection.
      void send(event).catch(() => {});
    } catch {
      /* Unsupported browser/network errors do not interrupt the attempt. */
    }
  };
}
