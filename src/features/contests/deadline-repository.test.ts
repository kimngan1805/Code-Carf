import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const tx = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  contest: { findUnique: vi.fn() },
  contestParticipant: { findUnique: vi.fn(), update: vi.fn() },
  contestExercise: { findUnique: vi.fn(), findMany: vi.fn() },
  contestDraft: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
  submission: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
}));
vi.mock("@/lib/db", () => ({
  db: { $transaction: async (run: (client: typeof tx) => unknown) => run(tx) },
}));
import {
  createTimedContestSubmission,
  finalizeSavedDraft,
  saveActiveDraft,
  startContestAttempt,
} from "./deadline-repository";

const start = Date.parse("2026-11-14T10:00:00Z");
const end = start + 3600000;
const participant = {
  startedAt: new Date(start),
  deadlineAt: new Date(end),
  finishedAt: null,
  faceVerifiedAt: null,
};
const draft = {
  exerciseId: "exercise",
  source: "print(1)",
  language: "python" as const,
  savedAt: new Date(end - 1000),
  finalSubmissionId: null,
};
const input = {
  userId: "student",
  contestId: "contest",
  exerciseId: "exercise",
  source: "print(1)",
  language: "python",
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(end - 1);
  tx.contest.findUnique.mockResolvedValue({
    status: "PUBLISHED",
    durationMinutes: 60,
    examStartsAt: new Date(start),
    examEndsAt: new Date(end + 3600000),
    startsAt: new Date(start),
    endsAt: new Date(end),
    requireFaceCheck: false,
  });
  tx.contestParticipant.findUnique.mockResolvedValue(participant);
  tx.contestExercise.findUnique.mockResolvedValue({
    exercise: { kind: "CODE" },
  });
  tx.contestDraft.findUnique.mockResolvedValue(draft);
  tx.submission.create.mockResolvedValue({ id: "final-submission" });
  tx.submission.findFirst.mockResolvedValue(null);
  tx.contestExercise.findMany.mockResolvedValue([
    { exerciseId: "exercise" },
    { exerciseId: "next" },
  ]);
  tx.submission.findMany.mockResolvedValue([{ exerciseId: "exercise" }]);
});
afterEach(() => vi.useRealTimers());

describe("deadline persistence", () => {
  it("keeps a flagged participant's manual and automatic answers marked without changing grading status", async () => {
    tx.contestParticipant.findUnique.mockResolvedValue({
      ...participant,
      flaggedAt: new Date(start),
    });
    await createTimedContestSubmission(input);
    expect(tx.submission.create.mock.calls[0][0].data).toMatchObject({
      flaggedForReview: true,
      status: "RUNNING",
    });
    vi.setSystemTime(end);
    await finalizeSavedDraft("contest", "student");
    expect(tx.submission.create.mock.calls[1][0].data).toMatchObject({
      flaggedForReview: true,
      status: "PENDING",
    });
  });
  it("blocks explicit start before the shared exam opening", async () => {
    vi.setSystemTime(start - 1);
    tx.contestParticipant.findUnique.mockResolvedValue({
      ...participant,
      startedAt: null,
      deadlineAt: null,
    });
    await expect(
      startContestAttempt("contest", "student"),
    ).rejects.toMatchObject({ code: "EXAM_NOT_STARTED" });
    expect(tx.contestParticipant.update).not.toHaveBeenCalled();
  });
  it("caps a late starter's deadline at the shared exam closing", async () => {
    tx.contest.findUnique.mockResolvedValue({
      status: "PUBLISHED",
      durationMinutes: 60,
      requireFaceCheck: false,
      examStartsAt: new Date(start),
      examEndsAt: new Date(end + 60000),
    });
    tx.contestParticipant.findUnique.mockResolvedValue({
      ...participant,
      startedAt: null,
      deadlineAt: null,
    });
    await startContestAttempt("contest", "student");
    expect(
      tx.contestParticipant.update.mock.calls[0][0].data.deadlineAt,
    ).toEqual(new Date(end + 60000));
  });
  it("closes submissions and finalizes at the shared closing before the personal duration", async () => {
    tx.contest.findUnique.mockResolvedValue({
      status: "PUBLISHED",
      requireFaceCheck: false,
      examStartsAt: new Date(start),
      examEndsAt: new Date(end - 2),
    });
    await expect(createTimedContestSubmission(input)).rejects.toMatchObject({
      code: "CONTEST_NOT_OPEN",
    });
    await expect(finalizeSavedDraft("contest", "student")).resolves.toEqual({
      submissionId: "final-submission",
    });
    expect(
      tx.contestParticipant.update.mock.calls[0][0].data.finishedAt,
    ).toEqual(new Date(end - 2));
  });
  it("starts the personal clock only on explicit start, independent of registration dates", async () => {
    tx.contestParticipant.findUnique.mockResolvedValue({
      ...participant,
      startedAt: null,
      deadlineAt: null,
    });
    tx.contest.findUnique.mockResolvedValue({
      status: "PUBLISHED",
      durationMinutes: 20,
      examStartsAt: new Date(start),
      examEndsAt: new Date(end + 3600000),
      requireFaceCheck: false,
      startsAt: new Date(start - 100000),
      endsAt: new Date(start - 1000),
    });
    await startContestAttempt("contest", "student");
    expect(tx.contestParticipant.update.mock.calls[0][0].data).toEqual({
      startedAt: new Date(end - 1),
      deadlineAt: new Date(end - 1 + 20 * 60000),
    });
  });
  it("does not reset an existing attempt on repeated start or after duration changes", async () => {
    tx.contest.findUnique.mockResolvedValue({
      status: "PUBLISHED",
      durationMinutes: 5,
      examStartsAt: new Date(start),
      examEndsAt: new Date(end + 3600000),
      requireFaceCheck: false,
    });
    await expect(startContestAttempt("contest", "student")).resolves.toEqual({
      startedAt: new Date(start),
      deadlineAt: new Date(end),
    });
    expect(tx.contestParticipant.update).not.toHaveBeenCalled();
  });
  it("allows active submissions after registration has closed", async () => {
    tx.contest.findUnique.mockResolvedValue({
      status: "PUBLISHED",
      examStartsAt: new Date(start),
      examEndsAt: new Date(end + 3600000),
      startsAt: new Date(start - 100000),
      endsAt: new Date(start - 1000),
      requireFaceCheck: false,
    });
    await expect(createTimedContestSubmission(input)).resolves.toEqual({
      id: "final-submission",
    });
  });
  it("accepts a manual submission before the deadline and records its server time", async () => {
    await createTimedContestSubmission(input);
    expect(tx.submission.create.mock.calls[0][0].data.createdAt).toEqual(
      new Date(end - 1),
    );
  });
  it.each([
    input,
    { ...input, source: "print(2)" },
    { ...input, language: "javascript", source: "console.log(1)" },
  ])(
    "rejects resubmission even after code or language changes",
    async (answer) => {
      tx.submission.findFirst.mockResolvedValue({ id: "existing-submission" });
      await expect(createTimedContestSubmission(answer)).rejects.toMatchObject({
        status: 409,
        code: "EXERCISE_ALREADY_SUBMITTED",
      });
      expect(tx.submission.findFirst).toHaveBeenCalledWith({
        where: {
          contestId: input.contestId,
          userId: input.userId,
          exerciseId: input.exerciseId,
        },
        select: { id: true },
      });
      expect(tx.submission.create).not.toHaveBeenCalled();
    },
  );
  it("allows the first answer and scopes checks to the participant, contest and exercise", async () => {
    const changed = { ...input, source: "print(2)" };
    await expect(createTimedContestSubmission(changed)).resolves.toEqual({
      id: "final-submission",
    });
    expect(tx.submission.findFirst).toHaveBeenCalledWith({
      where: {
        contestId: changed.contestId,
        userId: changed.userId,
        exerciseId: changed.exerciseId,
      },
      select: { id: true },
    });
    expect(tx.submission.create.mock.calls[0][0].data).toMatchObject(changed);
    expect(tx.contestParticipant.update).not.toHaveBeenCalled();
  });
  it("finishes the attempt and stores the final result atomically when all exercises are submitted", async () => {
    tx.submission.findMany.mockResolvedValue([
      { exerciseId: "exercise" },
      { exerciseId: "next" },
    ]);
    await createTimedContestSubmission(input);
    expect(tx.contestParticipant.update).toHaveBeenCalledWith({
      where: { contestId_userId: { contestId: "contest", userId: "student" } },
      data: { finishedAt: new Date(end - 1) },
    });
    expect(tx.contestDraft.upsert.mock.calls[0][0].update).toEqual({
      finalSubmissionId: "final-submission",
    });
  });
  it("recovers a manually completed attempt before the timer expires", async () => {
    tx.contestParticipant.findUnique.mockResolvedValue({
      ...participant,
      finishedAt: new Date(end - 10),
    });
    tx.contestDraft.findUnique.mockResolvedValue({
      ...draft,
      finalSubmissionId: "last-manual",
    });
    await expect(finalizeSavedDraft("contest", "student")).resolves.toEqual({
      submissionId: "last-manual",
    });
    expect(tx.submission.create).not.toHaveBeenCalled();
  });
  it("rechecks the deadline after looking for an identical submission", async () => {
    tx.submission.findFirst.mockImplementation(async () => {
      vi.setSystemTime(end);
      return null;
    });
    await expect(createTimedContestSubmission(input)).rejects.toMatchObject({
      code: "CONTEST_NOT_OPEN",
    });
    expect(tx.submission.create).not.toHaveBeenCalled();
  });
  it.each([end, end + 1])(
    "rejects manual submissions at or after the deadline (%s)",
    async (now) => {
      vi.setSystemTime(now);
      await expect(createTimedContestSubmission(input)).rejects.toMatchObject({
        code: "CONTEST_NOT_OPEN",
      });
      expect(tx.submission.create).not.toHaveBeenCalled();
    },
  );
  it("checks time after waiting for a lock, rather than trusting the request's arrival time", async () => {
    tx.$queryRaw.mockImplementation(async () => {
      vi.setSystemTime(end);
      return [];
    });
    await expect(createTimedContestSubmission(input)).rejects.toMatchObject({
      code: "CONTEST_NOT_OPEN",
    });
    expect(tx.submission.create).not.toHaveBeenCalled();
  });
  it("rejects late draft changes instead of replacing the saved snapshot", async () => {
    vi.setSystemTime(end);
    await expect(
      saveActiveDraft("contest", "student", draft),
    ).rejects.toMatchObject({ code: "CONTEST_NOT_OPEN" });
    expect(tx.contestDraft.upsert).not.toHaveBeenCalled();
  });
  it("does not finalize before the server deadline", async () => {
    await expect(
      finalizeSavedDraft("contest", "student"),
    ).rejects.toMatchObject({ code: "CONTEST_NOT_ENDED" });
    expect(tx.submission.create).not.toHaveBeenCalled();
  });
  it("finalizes only the server's previously saved source", async () => {
    vi.setSystemTime(end);
    await expect(finalizeSavedDraft("contest", "student")).resolves.toEqual({
      submissionId: "final-submission",
    });
    expect(tx.submission.create.mock.calls[0][0].data).toMatchObject({
      source: "print(1)",
      exerciseId: "exercise",
      userId: "student",
      autoSubmitted: true,
    });
    expect(
      tx.contestParticipant.update.mock.calls[0][0].data.finishedAt,
    ).toEqual(new Date(end));
  });
  it("reuses the same final submission on retries", async () => {
    vi.setSystemTime(end);
    tx.contestParticipant.findUnique.mockResolvedValue({
      ...participant,
      finishedAt: new Date(end),
    });
    tx.contestDraft.findUnique.mockResolvedValue({
      ...draft,
      finalSubmissionId: "existing",
    });
    await expect(finalizeSavedDraft("contest", "student")).resolves.toEqual({
      submissionId: "existing",
    });
    expect(tx.submission.create).not.toHaveBeenCalled();
  });
  it("does not duplicate an identical manual submission", async () => {
    vi.setSystemTime(end);
    tx.submission.findFirst.mockResolvedValue({ id: "manual-submission" });
    await expect(finalizeSavedDraft("contest", "student")).resolves.toEqual({
      submissionId: "manual-submission",
    });
    expect(tx.submission.create).not.toHaveBeenCalled();
    expect(tx.submission.findFirst.mock.calls[0][0].where).toEqual({
      contestId: "contest",
      userId: "student",
      exerciseId: "exercise",
    });
  });
  it.each([
    null,
    { ...draft, source: "   " },
    { ...draft, exerciseId: null },
    { ...draft, savedAt: new Date(end) },
  ])("skips empty, inactive, or late snapshots", async (snapshot) => {
    vi.setSystemTime(end);
    tx.contestDraft.findUnique.mockResolvedValue(snapshot);
    await expect(finalizeSavedDraft("contest", "student")).resolves.toEqual({
      submissionId: null,
    });
    expect(tx.submission.create).not.toHaveBeenCalled();
  });
});
