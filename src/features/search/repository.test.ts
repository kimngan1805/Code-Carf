import type { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ queryRaw: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { $queryRaw: mocks.queryRaw } }));

import { findPublishedSearchResults } from "./repository";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.queryRaw.mockResolvedValue([]);
});

describe("findPublishedSearchResults", () => {
  it("excludes soft-deleted paths from both path and room search queries", async () => {
    await findPublishedSearchResults("cpp");

    expect(mocks.queryRaw).toHaveBeenCalledTimes(3);
    const [pathSql, roomSql, contestSql] = mocks.queryRaw.mock.calls.map(
      (call) => (call[0] as Prisma.Sql).strings.join(" "),
    );

    expect(pathSql).toContain('FROM "Path" p');
    expect(pathSql).toContain('p.published = true AND p."deletedAt" IS NULL');

    expect(roomSql).toContain(
      'FROM "Room" r JOIN "Path" p ON p.id = r."pathId"',
    );
    expect(roomSql).toContain(
      'r.published = true AND p.published = true AND p."deletedAt" IS NULL',
    );

    expect(contestSql).toContain('FROM "Contest" c');
    expect(contestSql).toContain("c.status = 'PUBLISHED'");
  });
});
