import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  upsert: vi.fn(),
}));
vi.mock("@/features/auth/service", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/lib/db", () => ({
  db: {
    contest: { findFirst: mocks.findFirst },
    contestParticipant: { findUnique: mocks.findUnique, upsert: mocks.upsert },
  },
}));
import { getContestEntry, registerForContest } from "./service";

const start = new Date("2026-11-15T02:00:00Z");
const contest = {
  id: "contest",
  startsAt: start,
  endsAt: new Date(+start + 3600000),
  examStartsAt: new Date(+start + 3600000),
  examEndsAt: new Date(+start + 7200000),
  requireFaceCheck: false,
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(start);
  mocks.requireRole.mockResolvedValue({
    id: "student",
    role: { name: "STUDENT" },
  });
  mocks.findFirst.mockResolvedValue(contest);
});
import { afterEach } from "vitest";
afterEach(() => vi.useRealTimers());

describe("contest registration service", () => {
  it("returns the existing registration when another request wins the insert", async () => {
    const participant = {
      joinedAt: start,
      finishedAt: null,
      faceVerifiedAt: null,
    };
    mocks.upsert.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Duplicate participant", {
        code: "P2002",
        clientVersion: "6.19.3",
      }),
    );
    mocks.findUnique.mockResolvedValue(participant);
    await expect(registerForContest("sample")).resolves.toEqual(participant);
  });
  it("uses the signed-in student and an idempotent database upsert", async () => {
    mocks.upsert.mockResolvedValue({ joinedAt: start });
    await registerForContest("sample");
    await registerForContest("sample");
    expect(mocks.requireRole).toHaveBeenCalledWith(["STUDENT"]);
    expect(mocks.upsert).toHaveBeenCalledWith({
      where: { contestId_userId: { contestId: "contest", userId: "student" } },
      create: { contestId: "contest", userId: "student" },
      update: {},
      select: {
        joinedAt: true,
        startedAt: true,
        deadlineAt: true,
        finishedAt: true,
        faceVerifiedAt: true,
      },
    });
  });
  it("does not register a student in an ended contest", async () => {
    vi.setSystemTime(contest.endsAt);
    await expect(registerForContest("sample")).rejects.toMatchObject({
      code: "REGISTRATION_CLOSED",
    });
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("checks entry on the server even for direct page visits", async () => {
    mocks.findFirst.mockResolvedValue({
      ...contest,
      endsAt: new Date(+start - 1),
      examStartsAt: start,
      examEndsAt: new Date(+start + 7200000),
    });
    mocks.findUnique.mockResolvedValue(null);
    await expect(getContestEntry("sample")).rejects.toMatchObject({
      code: "NOT_REGISTERED",
    });
    mocks.findUnique.mockResolvedValue({
      startedAt: start,
      deadlineAt: new Date(+start + 3600000),
      finishedAt: null,
      faceVerifiedAt: null,
    });
    vi.setSystemTime(+start - 1);
    await expect(getContestEntry("sample")).rejects.toMatchObject({
      code: "EXAM_NOT_STARTED",
    });
    vi.setSystemTime(start);
    await expect(getContestEntry("sample")).resolves.toMatchObject({
      userId: "student",
      serverNow: +start,
    });
  });
  it("registration does not write a start time", async () => {
    mocks.upsert.mockResolvedValue({
      joinedAt: start,
      startedAt: null,
      deadlineAt: null,
    });
    await registerForContest("sample");
    expect(mocks.upsert.mock.calls[0][0].create).toEqual({
      contestId: "contest",
      userId: "student",
    });
  });
});
