import { XpSource } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../lib/errors";

const { mockTx, mockTransaction } = vi.hoisted(() => {
  const tx = {
    xpEvent: { create: vi.fn() },
    user: { update: vi.fn() },
  };
  const transaction = vi.fn(
    async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
  );
  return { mockTx: tx, mockTransaction: transaction };
});

vi.mock("../../lib/db", () => ({
  db: { $transaction: mockTransaction },
}));

import { recordLearningActivity } from "./activity";

describe("recordLearningActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (callback) => callback(mockTx));
  });

  it("creates an XpEvent and increments User.xp in a single transaction", async () => {
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
    });

    expect(mockTransaction).toHaveBeenCalledTimes(1);
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
      data: { xp: { increment: 50 } },
      select: { xp: true },
    });
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
});
