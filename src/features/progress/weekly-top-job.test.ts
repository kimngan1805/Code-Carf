import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../lib/errors";

const { mockTx, mockTransaction, loggerMock } = vi.hoisted(() => {
  const tx = {
    $executeRaw: vi.fn(),
    xpEvent: { groupBy: vi.fn() },
    badge: { findMany: vi.fn(), createMany: vi.fn() },
    userBadge: { findMany: vi.fn(), createMany: vi.fn() },
  };
  const transaction = vi.fn(
    async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
  );
  return {
    mockTx: tx,
    mockTransaction: transaction,
    loggerMock: { info: vi.fn(), error: vi.fn() },
  };
});

vi.mock("../../lib/db", () => ({
  db: { $transaction: mockTransaction },
}));

vi.mock("../../lib/logger", () => ({
  logger: loggerMock,
}));

import { POST } from "../../app/api/cron/weekly-top-badge/route";
import { awardCompletedWeekTopBadge } from "./badge-awarding";
import {
  authorizeCronRequest,
  getRecentCompletedWeekRanges,
  runWeeklyTopBadgeJob,
} from "./weekly-top-job";

const VALID_SECRET = "super-secret-cron-token-2026";

describe("authorizeCronRequest", () => {
  it("throws 503 CRON_NOT_CONFIGURED when server CRON_SECRET is missing or too short", () => {
    const req = new Request("https://example.com/api/cron/weekly-top-badge", {
      method: "POST",
      headers: { Authorization: `Bearer ${VALID_SECRET}` },
    });

    expect(() => authorizeCronRequest(req, undefined)).toThrowError(AppError);
    expect(() => authorizeCronRequest(req, "")).toThrowError(
      expect.objectContaining({ status: 503, code: "CRON_NOT_CONFIGURED" }),
    );
    expect(() => authorizeCronRequest(req, "short")).toThrowError(
      expect.objectContaining({ status: 503, code: "CRON_NOT_CONFIGURED" }),
    );
  });

  it("throws 401 UNAUTHORIZED for missing, malformed, or wrong Bearer tokens", () => {
    const noHeader = new Request(
      "https://example.com/api/cron/weekly-top-badge",
      {
        method: "POST",
      },
    );
    const wrongScheme = new Request(
      "https://example.com/api/cron/weekly-top-badge",
      {
        method: "POST",
        headers: { Authorization: `Basic ${VALID_SECRET}` },
      },
    );
    const wrongToken = new Request(
      "https://example.com/api/cron/weekly-top-badge",
      {
        method: "POST",
        headers: { Authorization: "Bearer wrong-secret-token" },
      },
    );

    expect(() => authorizeCronRequest(noHeader, VALID_SECRET)).toThrowError(
      expect.objectContaining({ status: 401, code: "UNAUTHORIZED" }),
    );
    expect(() => authorizeCronRequest(wrongScheme, VALID_SECRET)).toThrowError(
      expect.objectContaining({ status: 401, code: "UNAUTHORIZED" }),
    );
    expect(() => authorizeCronRequest(wrongToken, VALID_SECRET)).toThrowError(
      expect.objectContaining({ status: 401, code: "UNAUTHORIZED" }),
    );
  });

  it("accepts a matching Bearer token", () => {
    const req = new Request("https://example.com/api/cron/weekly-top-badge", {
      method: "POST",
      headers: { Authorization: `Bearer ${VALID_SECRET}` },
    });

    expect(() => authorizeCronRequest(req, VALID_SECRET)).not.toThrow();
  });
});

describe("getRecentCompletedWeekRanges", () => {
  it("returns closed Asia/Ho_Chi_Minh Monday-to-Sunday windows oldest to newest and excludes the ongoing week", () => {
    // Wednesday Nov 18, 2026 15:00 +07:00 => ongoing week is Nov 16..Nov 23.
    const ref = new Date("2026-11-18T15:00:00+07:00");
    const ranges = getRecentCompletedWeekRanges(ref, 3);

    expect(ranges).toEqual([
      {
        startsAt: new Date("2026-10-26T00:00:00+07:00"),
        endsAt: new Date("2026-11-02T00:00:00+07:00"),
      },
      {
        startsAt: new Date("2026-11-02T00:00:00+07:00"),
        endsAt: new Date("2026-11-09T00:00:00+07:00"),
      },
      {
        startsAt: new Date("2026-11-09T00:00:00+07:00"),
        endsAt: new Date("2026-11-16T00:00:00+07:00"),
      },
    ]);
  });
});

describe("awardCompletedWeekTopBadge & runWeeklyTopBadgeJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTransaction.mockImplementation(async (callback) => callback(mockTx));
    mockTx.$executeRaw.mockResolvedValue(1);
    mockTx.badge.findMany.mockResolvedValue([
      { id: "b-top1", slug: "weekly-top-1" },
    ]);
    mockTx.badge.createMany.mockResolvedValue({ count: 0 });
    mockTx.userBadge.findMany.mockResolvedValue([]);
    mockTx.userBadge.createMany.mockResolvedValue({ count: 1 });
  });

  it("refuses to award an ongoing week even when passed explicitly", async () => {
    const ongoingRef = new Date("2026-11-15T23:59:59+07:00");
    const ongoingWeek = {
      startsAt: new Date("2026-11-09T00:00:00+07:00"),
      endsAt: new Date("2026-11-16T00:00:00+07:00"),
    };

    const result = await awardCompletedWeekTopBadge(ongoingRef, {
      week: ongoingWeek,
    });

    expect(mockTransaction).not.toHaveBeenCalled();
    expect(result.winnerUserIds).toEqual([]);
    expect(result.awardedUserIds).toEqual([]);
  });

  it("catches up on missed weeks, handles ties and zero-XP weeks, and never awards duplicate badges", async () => {
    // Running late on Wednesday Nov 18 after missing Nov 9 and Nov 16 scheduled runs.
    const ref = new Date("2026-11-18T10:00:00+07:00");

    mockTx.xpEvent.groupBy
      // Week 1 (Oct 26..Nov 2): no XP
      .mockResolvedValueOnce([])
      // Week 2 (Nov 2..Nov 9, missed week): u-1 won with 200 XP
      .mockResolvedValueOnce([{ userId: "u-1", _sum: { amount: 200 } }])
      // Week 3 (Nov 9..Nov 16, latest closed week): u-1 and u-2 tied at 300 XP
      .mockResolvedValueOnce([
        { userId: "u-1", _sum: { amount: 300 } },
        { userId: "u-2", _sum: { amount: 300 } },
        { userId: "u-3", _sum: { amount: 150 } },
      ]);

    mockTx.userBadge.findMany
      // Week 2 check: u-1 does not have weekly-top-1 yet
      .mockResolvedValueOnce([])
      // Week 3 check: u-1 already received weekly-top-1 in Week 2
      .mockResolvedValueOnce([{ userId: "u-1" }]);

    const result = await runWeeklyTopBadgeJob(ref, { catchUpWeeks: 3 });

    expect(result.checkedWeeks).toHaveLength(3);
    expect(result.awards[0].winnerUserIds).toEqual([]);
    expect(result.awards[0].awardedUserIds).toEqual([]);

    expect(result.awards[1].winnerUserIds).toEqual(["u-1"]);
    expect(result.awards[1].awardedUserIds).toEqual(["u-1"]);

    expect(result.awards[2].winnerUserIds).toEqual(["u-1", "u-2"]);
    // u-1 already earned the badge in Week 2, so only u-2 is newly awarded.
    expect(result.awards[2].awardedUserIds).toEqual(["u-2"]);
    expect(result.totalAwardedCount).toBe(2);

    expect(mockTx.userBadge.createMany).toHaveBeenNthCalledWith(1, {
      data: [{ userId: "u-1", badgeId: "b-top1" }],
      skipDuplicates: true,
    });
    expect(mockTx.userBadge.createMany).toHaveBeenNthCalledWith(2, {
      data: [{ userId: "u-2", badgeId: "b-top1" }],
      skipDuplicates: true,
    });
  });

  it("acquires the PostgreSQL advisory lock when running repeated jobs", async () => {
    const ref = new Date("2026-11-16T00:15:00+07:00");
    mockTx.xpEvent.groupBy.mockResolvedValue([
      { userId: "u-1", _sum: { amount: 100 } },
    ]);
    // Already awarded on prior run
    mockTx.userBadge.findMany.mockResolvedValue([{ userId: "u-1" }]);

    const result = await runWeeklyTopBadgeJob(ref, { catchUpWeeks: 1 });

    expect(mockTx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(result.awards[0].winnerUserIds).toEqual(["u-1"]);
    expect(result.awards[0].awardedUserIds).toEqual([]);
    expect(result.totalAwardedCount).toBe(0);
    expect(mockTx.userBadge.createMany).not.toHaveBeenCalled();
  });
});

describe("POST /api/cron/weekly-top-badge", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = VALID_SECRET;
    mockTransaction.mockImplementation(async (callback) => callback(mockTx));
    mockTx.$executeRaw.mockResolvedValue(1);
    mockTx.xpEvent.groupBy.mockResolvedValue([]);
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalSecret;
    }
  });

  it("returns 401 when authorization header is missing or invalid", async () => {
    const unauthReq = new Request(
      "https://example.com/api/cron/weekly-top-badge",
      { method: "POST" },
    );
    const badTokenReq = new Request(
      "https://example.com/api/cron/weekly-top-badge",
      {
        method: "POST",
        headers: { Authorization: "Bearer wrong-token" },
      },
    );

    const res1 = await POST(unauthReq);
    const res2 = await POST(badTokenReq);

    expect(res1.status).toBe(401);
    expect(res2.status).toBe(401);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("returns 503 when CRON_SECRET is not configured on the server", async () => {
    delete process.env.CRON_SECRET;

    const req = new Request("https://example.com/api/cron/weekly-top-badge", {
      method: "POST",
      headers: { Authorization: `Bearer ${VALID_SECRET}` },
    });
    const res = await POST(req);

    expect(res.status).toBe(503);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("runs the weekly badge job and returns 200 with Cache-Control: no-store for authorized requests", async () => {
    const req = new Request("https://example.com/api/cron/weekly-top-badge", {
      method: "POST",
      headers: { Authorization: `Bearer ${VALID_SECRET}` },
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(body.error).toBeNull();
    expect(body.data.checkedWeeks).toHaveLength(4);
    expect(body.data.totalAwardedCount).toBe(0);
    expect(loggerMock.info).toHaveBeenCalledWith(
      "cron.weekly_top_badge_completed",
      expect.objectContaining({
        weeksChecked: 4,
        totalAwardedCount: 0,
      }),
    );
  });
});
