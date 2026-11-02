import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const tx = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  contest: { findUnique: vi.fn() },
  contestParticipant: { findUnique: vi.fn() },
  proctoringEvent: { findUnique: vi.fn(), count: vi.fn(), create: vi.fn() },
}));
const auth = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({
  db: { $transaction: (run: (client: typeof tx) => unknown) => run(tx) },
}));
vi.mock("@/features/auth/service", () => ({ requireRole: auth }));
import { reportContestEvent } from "./service";
import { recordProctoringEvent } from "./repository";
import { proctoringEventSchema } from "./schema";
import { createEventReporter } from "./reporter";

const now = Date.parse("2026-11-15T10:00:00Z");
const event = {
  clientEventId: "3269b164-6b44-4d45-a834-b7e19b3b4717",
  occurredAt: new Date(now).toISOString(),
  type: "PASTE" as const,
  pasteLength: 15,
};
const participant = {
  startedAt: new Date(now - 1000),
  deadlineAt: new Date(now + 60000),
  finishedAt: null,
  faceVerifiedAt: null,
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  auth.mockResolvedValue({ id: "student" });
  tx.contest.findUnique.mockResolvedValue({
    id: "contest",
    status: "PUBLISHED",
    examStartsAt: new Date(now - 1000),
    examEndsAt: new Date(now + 120000),
    requireFaceCheck: false,
  });
  tx.contestParticipant.findUnique.mockResolvedValue(participant);
  tx.proctoringEvent.findUnique.mockResolvedValue(null);
  tx.proctoringEvent.count.mockResolvedValue(0);
  tx.proctoringEvent.create.mockResolvedValue({ id: "saved" });
});
afterEach(() => vi.useRealTimers());

describe("proctoring event storage", () => {
  it("derives identity from the session and stores only paste length and diagnostic browser time", async () => {
    await reportContestEvent("sample", event);
    expect(auth).toHaveBeenCalledWith(["STUDENT"]);
    expect(tx.proctoringEvent.create.mock.calls[0][0].data).toEqual({
      contestId: "contest",
      userId: "student",
      clientEventId: event.clientEventId,
      type: "PASTE",
      metadata: { pasteLength: 15, clientOccurredAt: event.occurredAt },
    });
  });
  it.each([
    { ...event, userId: "forged" },
    { ...event, source: "secret paste" },
    { ...event, pasteLength: -1 },
    { ...event, type: "FACE_MISMATCH" },
  ])("rejects forged or unsupported payloads", async (body) => {
    await expect(reportContestEvent("sample", body)).rejects.toMatchObject({
      code: "INVALID_PROCTORING_EVENT",
    });
    expect(tx.proctoringEvent.create).not.toHaveBeenCalled();
  });
  it.each([
    null,
    { ...participant, startedAt: null, deadlineAt: null },
    { ...participant, finishedAt: new Date(now) },
    { ...participant, deadlineAt: new Date(now) },
  ])("rejects users without an active attempt", async (value) => {
    tx.contestParticipant.findUnique.mockResolvedValue(value);
    await expect(
      recordProctoringEvent("sample", "student", event),
    ).rejects.toBeDefined();
    expect(tx.proctoringEvent.create).not.toHaveBeenCalled();
  });
  it("blocks logging outside the shared exam window", async () => {
    vi.setSystemTime(now + 180000);
    await expect(
      recordProctoringEvent("sample", "student", event),
    ).rejects.toMatchObject({ code: "CONTEST_NOT_OPEN" });
  });
  it("serializes rate checks and rejects the 31st stored event", async () => {
    tx.proctoringEvent.count.mockResolvedValue(30);
    await expect(
      recordProctoringEvent("sample", "student", event),
    ).rejects.toMatchObject({ status: 429 });
    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(tx.proctoringEvent.create).not.toHaveBeenCalled();
  });
  it("deduplicates a retry before the rate check", async () => {
    tx.proctoringEvent.findUnique.mockResolvedValue({ id: "old" });
    expect(await recordProctoringEvent("sample", "student", event)).toEqual({
      eventId: "old",
      duplicate: true,
    });
    expect(tx.proctoringEvent.count).not.toHaveBeenCalled();
    expect(tx.proctoringEvent.create).not.toHaveBeenCalled();
  });
  it("rechecks expiry after slow DB reads", async () => {
    tx.proctoringEvent.count.mockImplementation(async () => {
      vi.setSystemTime(now + 60000);
      return 0;
    });
    await expect(
      recordProctoringEvent("sample", "student", event),
    ).rejects.toMatchObject({ code: "CONTEST_NOT_OPEN" });
    expect(tx.proctoringEvent.create).not.toHaveBeenCalled();
  });
});

describe("browser reporter", () => {
  it("sends tab changes and paste lengths without capturing clipboard contents", () => {
    const send = vi.fn().mockResolvedValue({});
    const report = createEventReporter(send);
    report("TAB_SWITCH");
    report("PASTE", 21);
    expect(send.mock.calls.map(([value]) => value.type)).toEqual([
      "TAB_SWITCH",
      "PASTE",
    ]);
    expect(proctoringEventSchema.parse(send.mock.calls[1][0]).type).toBe(
      "PASTE",
    );
    expect(send.mock.calls[1][0].pasteLength).toBe(21);
  });
  it("does not interrupt work on synchronous or asynchronous logging failure", async () => {
    expect(() =>
      createEventReporter(() => {
        throw new Error("offline");
      })("TAB_SWITCH"),
    ).not.toThrow();
    const report = createEventReporter(
      vi.fn().mockRejectedValue(new Error("offline")),
    );
    expect(() => report("PASTE", 3)).not.toThrow();
    await Promise.resolve();
  });
  it("throttles browser bursts and limits requests to 20 per minute", () => {
    const send = vi.fn().mockResolvedValue({});
    const report = createEventReporter(send);
    report("TAB_SWITCH");
    report("TAB_SWITCH");
    expect(send).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 25; i++) {
      vi.advanceTimersByTime(1001);
      report("PASTE", 3);
    }
    expect(send).toHaveBeenCalledTimes(20);
    vi.advanceTimersByTime(60000);
    report("TAB_SWITCH");
    expect(send).toHaveBeenCalledTimes(21);
  });
});
