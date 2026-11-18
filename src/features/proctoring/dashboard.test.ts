import { ProctoringEventType, RoleName } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  contestFindUnique: vi.fn(),
  participantCount: vi.fn(),
  participantFindMany: vi.fn(),
  participantFindUnique: vi.fn(),
  eventCount: vi.fn(),
  eventGroupBy: vi.fn(),
  eventFindMany: vi.fn(),
}));

vi.mock("@/features/auth/service", () => ({
  requireRole: mocks.requireRole,
}));

vi.mock("@/lib/db", () => ({
  db: {
    contest: {
      findUnique: mocks.contestFindUnique,
    },
    contestParticipant: {
      count: mocks.participantCount,
      findMany: mocks.participantFindMany,
      findUnique: mocks.participantFindUnique,
    },
    proctoringEvent: {
      count: mocks.eventCount,
      groupBy: mocks.eventGroupBy,
      findMany: mocks.eventFindMany,
    },
  },
}));

import { getContestViolationDashboard } from "./dashboard";
import {
  buildViolationDashboardUrl,
  decodeTimelineCursor,
  encodeTimelineCursor,
  parseProctoringMetadata,
  parseViolationDashboardFilters,
  PROCTORING_EVENT_LABELS,
  PROCTORING_EVENT_TYPES,
} from "./dashboard-helpers";

describe("proctoring dashboard helpers", () => {
  it("supports all ProctoringEventType enum labels", () => {
    for (const type of Object.values(ProctoringEventType)) {
      expect(PROCTORING_EVENT_TYPES).toContain(type);
      expect(PROCTORING_EVENT_LABELS[type]).toBeTruthy();
    }
  });

  it("safely parses null, malformed, or unexpected metadata without leaking raw JSON", () => {
    expect(parseProctoringMetadata(null)).toEqual({
      pasteLength: null,
      clientOccurredAt: null,
      summary: null,
    });
    expect(parseProctoringMetadata("invalid-string")).toEqual({
      pasteLength: null,
      clientOccurredAt: null,
      summary: null,
    });
    expect(parseProctoringMetadata(["bad"])).toEqual({
      pasteLength: null,
      clientOccurredAt: null,
      summary: null,
    });
    expect(
      parseProctoringMetadata(
        {
          pasteLength: -5,
          clientOccurredAt: "not-a-date",
          secret: "should-not-appear",
        },
        ProctoringEventType.PASTE,
      ),
    ).toEqual({
      pasteLength: null,
      clientOccurredAt: null,
      summary: null,
    });
    expect(
      parseProctoringMetadata(
        {
          pasteLength: 128.9,
          clientOccurredAt: "2026-11-18T05:00:00.000Z",
        },
        ProctoringEventType.PASTE,
      ),
    ).toEqual({
      pasteLength: 128,
      clientOccurredAt: "2026-11-18T05:00:00.000Z",
      summary: "Độ dài đoạn dán: 128 ký tự",
    });
  });

  it("parses and builds URL searchParams filters and timeline cursors cleanly", () => {
    const at = new Date("2026-11-18T06:00:00.000Z");
    const encoded = encodeTimelineCursor(at, "evt-99");
    expect(decodeTimelineCursor(encoded)).toEqual({
      createdAt: at,
      id: "evt-99",
    });
    expect(decodeTimelineCursor("bad-cursor")).toBeNull();

    const parsed = parseViolationDashboardFilters({
      flagged: "1",
      type: "PASTE",
      participant: " user-2 ",
      q: " Minh ",
      cursor: encoded,
      limit: "200",
    });
    expect(parsed).toMatchObject({
      flaggedOnly: true,
      eventType: ProctoringEventType.PASTE,
      participantId: "user-2",
      search: "Minh",
      cursor: { createdAt: at, id: "evt-99" },
      limit: 100,
    });

    expect(
      parseViolationDashboardFilters({ participant: "all" }).participantId,
    ).toBeNull();

    expect(
      buildViolationDashboardUrl("spring-cup", {
        flaggedOnly: true,
        eventType: ProctoringEventType.TAB_SWITCH,
        participantId: "user-1",
        search: "An",
        cursor: encoded,
      }),
    ).toBe(
      `/gv/contests/spring-cup?flagged=1&type=TAB_SWITCH&participant=user-1&q=An&cursor=${encodeURIComponent(encoded)}`,
    );
  });
});

describe("getContestViolationDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({
      id: "teacher-1",
      role: { name: RoleName.TEACHER },
    });
    mocks.contestFindUnique.mockResolvedValue({
      id: "contest-1",
      slug: "sample-contest",
      title: "Sample Contest",
      status: "PUBLISHED",
      creatorId: "teacher-1",
      violationThreshold: 3,
      examStartsAt: null,
      examEndsAt: null,
    });
    mocks.participantCount.mockResolvedValue(0);
    mocks.participantFindMany.mockResolvedValue([]);
    mocks.participantFindUnique.mockResolvedValue(null);
    mocks.eventCount.mockResolvedValue(0);
    mocks.eventGroupBy.mockResolvedValue([]);
    mocks.eventFindMany.mockResolvedValue([]);
  });

  it("allows contest owner and ADMIN, including ownerless contests for ADMIN", async () => {
    await expect(
      getContestViolationDashboard("sample-contest"),
    ).resolves.toMatchObject({
      contest: { id: "contest-1", slug: "sample-contest" },
    });

    mocks.requireRole.mockResolvedValue({
      id: "admin-1",
      role: { name: RoleName.ADMIN },
    });
    mocks.contestFindUnique.mockResolvedValue({
      id: "contest-orphan",
      slug: "orphan-contest",
      title: "Orphan Contest",
      status: "PUBLISHED",
      creatorId: null,
      violationThreshold: 3,
      examStartsAt: null,
      examEndsAt: null,
    });

    await expect(
      getContestViolationDashboard("orphan-contest"),
    ).resolves.toMatchObject({
      contest: { id: "contest-orphan" },
    });
  });

  it("blocks non-owner teachers, ownerless contests for teachers, and students", async () => {
    mocks.contestFindUnique.mockResolvedValue({
      id: "contest-1",
      slug: "sample-contest",
      title: "Sample Contest",
      status: "PUBLISHED",
      creatorId: "other-teacher",
      violationThreshold: 3,
      examStartsAt: null,
      examEndsAt: null,
    });
    await expect(
      getContestViolationDashboard("sample-contest"),
    ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
    expect(mocks.participantFindMany).not.toHaveBeenCalled();

    mocks.contestFindUnique.mockResolvedValue({
      id: "contest-orphan",
      slug: "orphan-contest",
      title: "Orphan Contest",
      status: "PUBLISHED",
      creatorId: null,
      violationThreshold: 3,
      examStartsAt: null,
      examEndsAt: null,
    });
    await expect(
      getContestViolationDashboard("orphan-contest"),
    ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });

    mocks.requireRole.mockRejectedValue(
      new AppError(403, "FORBIDDEN", "Insufficient permission"),
    );
    await expect(
      getContestViolationDashboard("sample-contest"),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("scopes DB filters, selects no sensitive fields, and handles cursor pagination", async () => {
    const t1 = new Date("2026-11-18T05:00:02.000Z");
    const t2 = new Date("2026-11-18T05:00:01.000Z");
    const t3 = new Date("2026-11-18T05:00:00.000Z");

    mocks.participantCount.mockResolvedValueOnce(2).mockResolvedValueOnce(1);
    mocks.eventCount.mockResolvedValueOnce(4).mockResolvedValueOnce(3);
    mocks.eventGroupBy
      .mockResolvedValueOnce([
        { type: ProctoringEventType.PASTE, _count: { _all: 3 } },
        { type: ProctoringEventType.TAB_SWITCH, _count: { _all: 1 } },
      ])
      .mockResolvedValueOnce([
        {
          userId: "student-1",
          type: ProctoringEventType.PASTE,
          _count: { _all: 3 },
        },
      ]);
    mocks.participantFindMany.mockResolvedValue([
      {
        userId: "student-1",
        violationCount: 4,
        flaggedAt: t1,
        startedAt: t3,
        finishedAt: null,
        user: { name: "Nguyễn Văn A" },
      },
    ]);
    mocks.eventFindMany.mockResolvedValue([
      {
        id: "evt-3",
        userId: "student-1",
        type: ProctoringEventType.PASTE,
        metadata: { pasteLength: 42 },
        createdAt: t1,
        user: { name: "Nguyễn Văn A", contestEntries: [{ flaggedAt: t1 }] },
      },
      {
        id: "evt-2",
        userId: "student-1",
        type: ProctoringEventType.PASTE,
        metadata: null,
        createdAt: t2,
        user: { name: "Nguyễn Văn A", contestEntries: [{ flaggedAt: t1 }] },
      },
      {
        id: "evt-1",
        userId: "student-1",
        type: ProctoringEventType.PASTE,
        metadata: "bad",
        createdAt: t3,
        user: { name: "Nguyễn Văn A", contestEntries: [{ flaggedAt: t1 }] },
      },
    ]);

    const result = await getContestViolationDashboard("sample-contest", {
      flagged: "1",
      type: "PASTE",
      participant: "student-1",
      q: "Nguyễn",
      limit: "2",
    });

    const participantQuery = mocks.participantFindMany.mock.calls[0][0];
    expect(participantQuery.where).toMatchObject({
      contestId: "contest-1",
      flaggedAt: { not: null },
    });
    expect(participantQuery.select.user.select).toEqual({ name: true });

    const eventQuery = mocks.eventFindMany.mock.calls[0][0];
    expect(eventQuery.where).toMatchObject({
      contestId: "contest-1",
      userId: "student-1",
      type: ProctoringEventType.PASTE,
    });
    expect(eventQuery.orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }]);
    expect(eventQuery.take).toBe(3);

    expect(result.timeline.items).toHaveLength(2);
    expect(result.timeline.hasMore).toBe(true);
    expect(result.timeline.nextCursor).toBe(encodeTimelineCursor(t2, "evt-2"));
    expect(result.timeline.items[0].metadata.summary).toBe(
      "Độ dài đoạn dán: 42 ký tự",
    );
    expect(result.timeline.items[1].metadata.summary).toBeNull();
  });
});
