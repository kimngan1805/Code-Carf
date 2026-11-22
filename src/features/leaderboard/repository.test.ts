import { RoleName } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  pathFindMany: vi.fn(),
  pathFindFirst: vi.fn(),
  xpEventGroupBy: vi.fn(),
  userFindMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    path: {
      findMany: mocks.pathFindMany,
      findFirst: mocks.pathFindFirst,
    },
    xpEvent: {
      groupBy: mocks.xpEventGroupBy,
    },
    user: {
      findMany: mocks.userFindMany,
    },
  },
}));

import {
  aggregateStudentXp,
  findPublishedPathForLeaderboard,
  listPublishedPathsForLeaderboard,
} from "./repository";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.pathFindMany.mockResolvedValue([]);
  mocks.pathFindFirst.mockResolvedValue(null);
  mocks.xpEventGroupBy.mockResolvedValue([]);
  mocks.userFindMany.mockResolvedValue([]);
});

describe("leaderboard repository soft-delete handling", () => {
  it("excludes soft-deleted paths from leaderboard path options and slug lookups", async () => {
    await listPublishedPathsForLeaderboard();
    expect(mocks.pathFindMany.mock.calls[0][0].where).toEqual({
      published: true,
      deletedAt: null,
    });

    await findPublishedPathForLeaderboard("deleted-path");
    expect(mocks.pathFindFirst.mock.calls[0][0].where).toEqual({
      slug: "deleted-path",
      published: true,
      deletedAt: null,
    });
  });

  it("preserves historical total and weekly XP across soft-deleted paths in aggregateStudentXp", async () => {
    mocks.xpEventGroupBy.mockResolvedValue([
      { userId: "student-1", _sum: { amount: 250 } },
    ]);
    mocks.userFindMany.mockResolvedValue([
      { id: "student-1", name: "Minh Thư" },
    ]);

    const startsAt = new Date("2026-11-16T00:00:00+07:00");
    const endsAt = new Date("2026-11-23T00:00:00+07:00");

    const allTime = await aggregateStudentXp({});
    expect(allTime).toEqual([
      { userId: "student-1", name: "Minh Thư", xp: 250 },
    ]);
    expect(mocks.xpEventGroupBy.mock.calls[0][0].where).toEqual({
      user: { role: { name: RoleName.STUDENT } },
    });

    await aggregateStudentXp({ startsAt, endsAt });
    expect(mocks.xpEventGroupBy.mock.calls[1][0].where).toEqual({
      user: { role: { name: RoleName.STUDENT } },
      createdAt: { gte: startsAt, lt: endsAt },
    });
  });
});
