import { XpSource } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../lib/errors";

const { mockTx, mockTransaction } = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(),
    xpEvent: { create: vi.fn(), groupBy: vi.fn() },
    user: { update: vi.fn(), findUnique: vi.fn() },
    userBadge: { findMany: vi.fn(), createMany: vi.fn() },
    submission: { findMany: vi.fn() },
    path: { findMany: vi.fn() },
    badge: { findMany: vi.fn(), createMany: vi.fn() },
  };
  const transaction = vi.fn(
    async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
  );
  return { mockTx: tx, mockTransaction: transaction };
});

vi.mock("../../lib/db", () => ({
  db: { $transaction: mockTransaction },
}));

import {
  recordLearningActivity,
  recordLearningActivityInTx,
  recordStreakActivity,
} from "./activity";
import { awardCompletedWeekTopBadge } from "./badge-awarding";

function setupDefaultBadgeSnapshot() {
  mockTx.$queryRaw.mockResolvedValue([{ id: "user-1" }]);
  mockTx.user.findUnique.mockResolvedValue({
    currentStreak: 0,
    longestStreak: 0,
    lastActiveOn: null,
  });
  mockTx.userBadge.findMany.mockResolvedValue([]);
  mockTx.submission.findMany.mockResolvedValue([]);
  mockTx.path.findMany.mockResolvedValue([]);
  mockTx.badge.findMany.mockResolvedValue([]);
  mockTx.badge.createMany.mockResolvedValue({ count: 0 });
  mockTx.userBadge.createMany.mockResolvedValue({ count: 0 });
}

describe("recordLearningActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (callback) => callback(mockTx));
    setupDefaultBadgeSnapshot();
  });

  it("creates an XpEvent, updates streak, and increments User.xp in a single transaction", async () => {
    const createdEvent = {
      id: "xp-evt-1",
      userId: "user-1",
      amount: 50,
      source: XpSource.ROOM_COMPLETED,
      pathId: "path-1",
      roomId: "room-1",
      contestId: null,
      createdAt: new Date("2026-11-13T10:00:00Z"),
    };
    mockTx.xpEvent.create.mockResolvedValue(createdEvent);
    mockTx.user.update.mockResolvedValue({ xp: 150 });

    const result = await recordLearningActivity({
      userId: "user-1",
      xp: 50,
      source: XpSource.ROOM_COMPLETED,
      pathId: "path-1",
      roomId: "room-1",
      occurredAt: new Date("2026-11-13T23:59:59+07:00"),
    });

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockTx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(mockTx.xpEvent.create).toHaveBeenCalledTimes(1);
    expect(mockTx.xpEvent.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        amount: 50,
        source: XpSource.ROOM_COMPLETED,
        pathId: "path-1",
        roomId: "room-1",
        contestId: null,
      },
    });
    expect(mockTx.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        xp: { increment: 50 },
        currentStreak: 1,
        longestStreak: 1,
        lastActiveOn: new Date("2026-11-13T00:00:00.000Z"),
      },
      select: { xp: true },
    });
    expect(mockTx.userBadge.createMany).not.toHaveBeenCalled();
    expect(result).toEqual({ xpEvent: createdEvent, xp: 150 });
  });

  it("supports contestId and trims identifier inputs", async () => {
    const createdEvent = {
      id: "xp-evt-2",
      userId: "user-2",
      amount: 100,
      source: XpSource.CONTEST_RESULT,
      pathId: null,
      roomId: null,
      contestId: "contest-1",
      createdAt: new Date("2026-11-13T10:00:00Z"),
    };
    mockTx.xpEvent.create.mockResolvedValue(createdEvent);
    mockTx.user.update.mockResolvedValue({ xp: 100 });

    const result = await recordLearningActivity({
      userId: "  user-2  ",
      xp: 100,
      source: XpSource.CONTEST_RESULT,
      contestId: "  contest-1 ",
    });

    expect(mockTx.xpEvent.create).toHaveBeenCalledWith({
      data: {
        userId: "user-2",
        amount: 100,
        source: XpSource.CONTEST_RESULT,
        pathId: null,
        roomId: null,
        contestId: "contest-1",
      },
    });
    expect(result.xp).toBe(100);
  });

  it("awards eligible milestone badges inside the same transaction without creating badge XpEvents", async () => {
    const createdEvent = {
      id: "xp-evt-badge",
      userId: "user-1",
      amount: 50,
      source: XpSource.ROOM_COMPLETED,
      pathId: "path-1",
      roomId: "room-2",
      contestId: null,
      createdAt: new Date("2026-11-14T10:00:00Z"),
    };
    mockTx.xpEvent.create.mockResolvedValue(createdEvent);
    mockTx.user.update.mockResolvedValue({ xp: 200 });
    mockTx.user.findUnique.mockResolvedValue({
      currentStreak: 7,
      longestStreak: 7,
    });
    mockTx.submission.findMany.mockResolvedValue([
      { exerciseId: "ex-1" },
      { exerciseId: "ex-2" },
      { exerciseId: "ex-3" },
      { exerciseId: "ex-4" },
      { exerciseId: "ex-5" },
    ]);
    mockTx.path.findMany.mockResolvedValue([
      {
        id: "path-1",
        rooms: [
          { id: "r-1", progress: [{ roomId: "r-1" }] },
          { id: "r-2", progress: [{ roomId: "r-2" }] },
        ],
      },
    ]);
    mockTx.badge.findMany.mockResolvedValue([
      { id: "b-path", slug: "path-completed" },
      { id: "b-5ex", slug: "five-exercises" },
      { id: "b-s7", slug: "streak-7" },
    ]);
    mockTx.userBadge.createMany.mockResolvedValue({ count: 3 });

    const result = await recordLearningActivity({
      userId: "user-1",
      xp: 50,
      source: XpSource.ROOM_COMPLETED,
      pathId: "path-1",
      roomId: "room-2",
    });

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockTx.xpEvent.create).toHaveBeenCalledTimes(1);
    expect(mockTx.path.findMany.mock.calls[0][0].where).toEqual({
      published: true,
      deletedAt: null,
      OR: [
        { enrollments: { some: { userId: "user-1" } } },
        {
          rooms: {
            some: { published: true, progress: { some: { userId: "user-1" } } },
          },
        },
      ],
    });
    expect(mockTx.path.findMany.mock.calls[0][0].select.rooms.where).toEqual({
      published: true,
    });
    expect(mockTx.submission.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", status: "ACCEPTED" },
      distinct: ["exerciseId"],
      select: { exerciseId: true },
    });
    expect(mockTx.userBadge.createMany).toHaveBeenCalledWith({
      data: [
        { userId: "user-1", badgeId: "b-path" },
        { userId: "user-1", badgeId: "b-5ex" },
        { userId: "user-1", badgeId: "b-s7" },
      ],
      skipDuplicates: true,
    });
    expect(result).toEqual({ xpEvent: createdEvent, xp: 200 });
  });

  it("skips already-earned badges across repeated calls and only grants new ones", async () => {
    mockTx.xpEvent.create.mockResolvedValue({ id: "xp-evt-repeat" });
    mockTx.user.update.mockResolvedValue({ xp: 250 });
    mockTx.user.findUnique.mockResolvedValue({
      currentStreak: 7,
      longestStreak: 7,
    });
    mockTx.userBadge.findMany.mockResolvedValue([
      { badge: { slug: "path-completed" } },
      { badge: { slug: "five-exercises" } },
      { badge: { slug: "streak-7" } },
    ]);
    mockTx.submission.findMany.mockResolvedValue([
      { exerciseId: "ex-1" },
      { exerciseId: "ex-2" },
      { exerciseId: "ex-3" },
      { exerciseId: "ex-4" },
      { exerciseId: "ex-5" },
    ]);
    mockTx.path.findMany.mockResolvedValue([
      { id: "path-1", rooms: [{ id: "r-1", progress: [{ roomId: "r-1" }] }] },
    ]);

    await recordLearningActivity({
      userId: "user-1",
      xp: 50,
      source: XpSource.ROOM_COMPLETED,
    });

    expect(mockTx.badge.findMany).not.toHaveBeenCalled();
    expect(mockTx.userBadge.createMany).not.toHaveBeenCalled();
  });

  it("seeds missing badge catalog rows inside the transaction using skipDuplicates", async () => {
    mockTx.xpEvent.create.mockResolvedValue({ id: "xp-evt-seed" });
    mockTx.user.update.mockResolvedValue({ xp: 100 });
    mockTx.user.findUnique.mockResolvedValue({
      currentStreak: 2,
      longestStreak: 7,
    });
    mockTx.badge.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "b-s7", slug: "streak-7" }]);

    await recordLearningActivity({
      userId: "user-1",
      xp: 25,
      source: XpSource.ROOM_COMPLETED,
    });

    expect(mockTx.badge.createMany).toHaveBeenCalledWith({
      data: [
        {
          slug: "streak-7",
          name: "Chuỗi 7 ngày",
          description: "Học 7 ngày liên tiếp",
        },
      ],
      skipDuplicates: true,
    });
    expect(mockTx.userBadge.createMany).toHaveBeenCalledWith({
      data: [{ userId: "user-1", badgeId: "b-s7" }],
      skipDuplicates: true,
    });
  });

  it.each([
    {
      label: "empty userId",
      input: { userId: "   ", xp: 50, source: XpSource.ROOM_COMPLETED },
    },
    {
      label: "zero xp",
      input: { userId: "user-1", xp: 0, source: XpSource.ROOM_COMPLETED },
    },
    {
      label: "negative xp",
      input: { userId: "user-1", xp: -20, source: XpSource.ROOM_COMPLETED },
    },
    {
      label: "fractional xp",
      input: { userId: "user-1", xp: 12.5, source: XpSource.ROOM_COMPLETED },
    },
    {
      label: "NaN xp",
      input: {
        userId: "user-1",
        xp: Number.NaN,
        source: XpSource.ROOM_COMPLETED,
      },
    },
    {
      label: "invalid source",
      input: {
        userId: "user-1",
        xp: 20,
        source: "UNKNOWN" as XpSource,
      },
    },
    {
      label: "empty optional pathId",
      input: {
        userId: "user-1",
        xp: 20,
        source: XpSource.ROOM_COMPLETED,
        pathId: "",
      },
    },
  ])(
    "rejects invalid input ($label) without starting a transaction",
    async ({ input }) => {
      await expect(recordLearningActivity(input)).rejects.toThrowError(
        AppError,
      );
      await expect(recordLearningActivity(input)).rejects.toMatchObject({
        status: 400,
        code: "INVALID_LEARNING_ACTIVITY",
      });
      expect(mockTransaction).not.toHaveBeenCalled();
    },
  );

  it("propagates errors when xpEvent.create fails and skips user.update", async () => {
    const dbError = new Error("Foreign key constraint failed");
    mockTx.xpEvent.create.mockRejectedValue(dbError);

    await expect(
      recordLearningActivity({
        userId: "missing-user",
        xp: 50,
        source: XpSource.ROOM_COMPLETED,
      }),
    ).rejects.toThrow(dbError);

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockTx.user.update).not.toHaveBeenCalled();
  });

  it("propagates errors when user.update fails inside the transaction", async () => {
    const dbError = new Error("Record to update not found");
    mockTx.xpEvent.create.mockResolvedValue({ id: "xp-evt-3" });
    mockTx.user.update.mockRejectedValue(dbError);

    await expect(
      recordLearningActivity({
        userId: "user-1",
        xp: 50,
        source: XpSource.ROOM_COMPLETED,
      }),
    ).rejects.toThrow(dbError);

    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(mockTx.xpEvent.create).toHaveBeenCalledTimes(1);
    expect(mockTx.user.update).toHaveBeenCalledTimes(1);
  });

  it("propagates errors when badge persistence fails so the XP transaction rolls back cleanly", async () => {
    const dbError = new Error("Transient DB failure during userBadge insert");
    mockTx.xpEvent.create.mockResolvedValue({ id: "xp-evt-4" });
    mockTx.user.update.mockResolvedValue({ xp: 100 });
    mockTx.user.findUnique.mockResolvedValue({
      currentStreak: 7,
      longestStreak: 7,
    });
    mockTx.badge.findMany.mockResolvedValue([{ id: "b-s7", slug: "streak-7" }]);
    mockTx.userBadge.createMany.mockRejectedValue(dbError);

    await expect(
      recordLearningActivity({
        userId: "user-1",
        xp: 50,
        source: XpSource.ROOM_COMPLETED,
      }),
    ).rejects.toThrow(dbError);

    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });
});

describe("awardCompletedWeekTopBadge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (callback) => callback(mockTx));
    setupDefaultBadgeSnapshot();
  });

  it("awards weekly-top-1 to tied #1 learners from the most recently ended Asia/Ho_Chi_Minh week", async () => {
    const ref = new Date("2026-11-16T01:00:00+07:00");
    mockTx.xpEvent.groupBy.mockResolvedValue([
      { userId: "u-1", _sum: { amount: 180 } },
      { userId: "u-2", _sum: { amount: 180 } },
      { userId: "u-3", _sum: { amount: 90 } },
    ]);
    mockTx.badge.findMany.mockResolvedValue([
      { id: "b-top1", slug: "weekly-top-1" },
    ]);
    mockTx.userBadge.findMany.mockResolvedValue([{ userId: "u-1" }]);
    mockTx.userBadge.createMany.mockResolvedValue({ count: 1 });

    const result = await awardCompletedWeekTopBadge(ref);

    expect(mockTx.xpEvent.groupBy).toHaveBeenCalledWith({
      by: ["userId"],
      where: {
        createdAt: {
          gte: new Date("2026-11-09T00:00:00+07:00"),
          lt: new Date("2026-11-16T00:00:00+07:00"),
        },
        user: { role: { name: "STUDENT" } },
      },
      _sum: { amount: true },
    });
    expect(mockTx.userBadge.createMany).toHaveBeenCalledWith({
      data: [{ userId: "u-2", badgeId: "b-top1" }],
      skipDuplicates: true,
    });
    expect(result).toEqual({
      week: {
        startsAt: new Date("2026-11-09T00:00:00+07:00"),
        endsAt: new Date("2026-11-16T00:00:00+07:00"),
      },
      winnerUserIds: ["u-1", "u-2"],
      awardedUserIds: ["u-2"],
    });
  });

  it("awards nobody when the completed week has no XP > 0", async () => {
    const ref = new Date("2026-11-16T01:00:00+07:00");
    mockTx.xpEvent.groupBy.mockResolvedValue([
      { userId: "u-1", _sum: { amount: 0 } },
    ]);

    const result = await awardCompletedWeekTopBadge(ref);

    expect(mockTx.userBadge.createMany).not.toHaveBeenCalled();
    expect(result.winnerUserIds).toEqual([]);
    expect(result.awardedUserIds).toEqual([]);
  });
});

describe("recordLearningActivityInTx", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultBadgeSnapshot();
  });

  it("writes through the caller's transaction and never opens its own", async () => {
    const event = { id: "xp-evt-3" };
    mockTx.xpEvent.create.mockResolvedValue(event);
    mockTx.user.update.mockResolvedValue({ xp: 250 });

    const result = await recordLearningActivityInTx(mockTx as never, {
      userId: "user-1",
      xp: 50,
      source: XpSource.ROOM_COMPLETED,
      roomId: "room-1",
    });

    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockTx.xpEvent.create).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ xpEvent: event, xp: 250 });
  });

  it("rejects invalid input before writing anything", async () => {
    await expect(
      recordLearningActivityInTx(mockTx as never, {
        userId: "user-1",
        xp: 0,
        source: XpSource.ROOM_COMPLETED,
      }),
    ).rejects.toBeInstanceOf(AppError);
    expect(mockTx.xpEvent.create).not.toHaveBeenCalled();
  });
});

describe("recordStreakActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (callback) => callback(mockTx));
    setupDefaultBadgeSnapshot();
  });

  it("updates streak from 6 to 7 before evaluating badges without creating any XpEvent", async () => {
    mockTx.user.findUnique
      .mockResolvedValueOnce({
        currentStreak: 6,
        longestStreak: 6,
        lastActiveOn: new Date("2026-11-11T00:00:00.000Z"),
      })
      .mockResolvedValueOnce({
        currentStreak: 7,
        longestStreak: 7,
      });
    mockTx.badge.findMany.mockResolvedValue([{ id: "b-s7", slug: "streak-7" }]);
    mockTx.userBadge.createMany.mockResolvedValue({ count: 1 });

    const result = await recordStreakActivity({
      userId: "user-1",
      occurredAt: new Date("2026-11-12T00:00:00+07:00"),
    });

    expect(mockTx.xpEvent.create).not.toHaveBeenCalled();
    expect(mockTx.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        currentStreak: 7,
        longestStreak: 7,
        lastActiveOn: new Date("2026-11-12T00:00:00.000Z"),
      },
    });
    expect(mockTx.userBadge.createMany).toHaveBeenCalledWith({
      data: [{ userId: "user-1", badgeId: "b-s7" }],
      skipDuplicates: true,
    });
    expect(result).toEqual({
      currentStreak: 7,
      longestStreak: 7,
      lastActiveOn: new Date("2026-11-12T00:00:00.000Z"),
      updated: true,
    });
  });

  it("skips user.update when already active on the same Vietnam calendar day", async () => {
    mockTx.user.findUnique.mockResolvedValue({
      currentStreak: 3,
      longestStreak: 5,
      lastActiveOn: new Date("2026-11-12T00:00:00.000Z"),
    });

    const result = await recordStreakActivity({
      userId: "user-1",
      occurredAt: new Date("2026-11-12T23:59:59+07:00"),
    });

    expect(mockTx.xpEvent.create).not.toHaveBeenCalled();
    expect(mockTx.user.update).not.toHaveBeenCalled();
    expect(result).toEqual({
      currentStreak: 3,
      longestStreak: 5,
      lastActiveOn: new Date("2026-11-12T00:00:00.000Z"),
      updated: false,
    });
  });

  it("rejects blank userId without starting a transaction", async () => {
    await expect(recordStreakActivity({ userId: "   " })).rejects.toMatchObject(
      {
        status: 400,
        code: "INVALID_LEARNING_ACTIVITY",
      },
    );
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});
