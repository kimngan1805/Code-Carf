import { ContestStatus, RoleName } from "@prisma/client";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  findContest: vi.fn(),
  findParticipant: vi.fn(),
  findParticipants: vi.fn(),
}));

vi.mock("@/features/auth/service", () => ({
  requireRole: mocks.requireRole,
}));

vi.mock("@/lib/db", () => ({
  db: {
    contest: {
      findFirst: mocks.findContest,
    },
    contestParticipant: {
      findUnique: mocks.findParticipant,
      findMany: mocks.findParticipants,
    },
  },
}));

import { GET as getSnapshotRoute } from "@/app/api/contests/[slug]/leaderboard/route";
import { GET as getStreamRoute } from "@/app/api/contests/[slug]/leaderboard/stream/route";
import {
  emitContestLeaderboardUpdated,
  resetContestLeaderboardBusForTests,
} from "./contest-events";
import { getContestLeaderboard } from "./contest-leaderboard";

const baseContest = {
  id: "contest-1",
  slug: "sample-contest",
  title: "Sample Contest",
  status: ContestStatus.PUBLISHED,
  penaltyMinutes: 20,
  examStartsAt: new Date("2026-11-15T01:00:00Z"),
  examEndsAt: new Date("2026-11-15T05:00:00Z"),
  _count: { exercises: 2 },
};

beforeEach(() => {
  vi.clearAllMocks();
  resetContestLeaderboardBusForTests();
  mocks.requireRole.mockResolvedValue({
    id: "user-1",
    role: RoleName.STUDENT,
  });
  mocks.findContest.mockResolvedValue(baseContest);
  mocks.findParticipant.mockResolvedValue({ userId: "user-1" });
  mocks.findParticipants.mockResolvedValue([
    {
      userId: "user-2",
      score: 200,
      penaltyMinutes: 0,
      finishedAt: new Date("2026-11-15T02:00:00Z"),
      user: { id: "user-2", name: "Minh Anh" },
    },
    {
      userId: "user-1",
      score: 100,
      penaltyMinutes: 20,
      finishedAt: null,
      user: { id: "user-1", name: "Minh Thư" },
    },
  ]);
});

describe("contest leaderboard authorization & privacy", () => {
  it("returns 401 when unauthenticated on both JSON API and SSE stream", async () => {
    mocks.requireRole.mockRejectedValue(
      new AppError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập"),
    );

    const apiResponse = await getSnapshotRoute(
      new NextRequest(
        "http://localhost/api/contests/sample-contest/leaderboard",
      ),
      { params: Promise.resolve({ slug: "sample-contest" }) },
    );
    const streamResponse = await getStreamRoute(
      new NextRequest(
        "http://localhost/api/contests/sample-contest/leaderboard/stream",
      ),
      { params: Promise.resolve({ slug: "sample-contest" }) },
    );

    expect(apiResponse.status).toBe(401);
    expect(apiResponse.headers.get("Cache-Control")).toBe("no-store");
    expect(streamResponse.status).toBe(401);
  });

  it("returns 403 for non-registered students or wrong roles", async () => {
    mocks.findParticipant.mockResolvedValue(null);

    const response = await getSnapshotRoute(
      new NextRequest(
        "http://localhost/api/contests/sample-contest/leaderboard",
      ),
      { params: Promise.resolve({ slug: "sample-contest" }) },
    );
    expect(response.status).toBe(403);

    mocks.requireRole.mockRejectedValue(
      new AppError(403, "FORBIDDEN", "Không có quyền"),
    );
    await expect(getContestLeaderboard("sample-contest")).rejects.toMatchObject(
      {
        status: 403,
      },
    );
  });

  it("returns 404 when contest is missing or DRAFT", async () => {
    mocks.findContest.mockResolvedValue(null);

    const response = await getSnapshotRoute(
      new NextRequest("http://localhost/api/contests/draft/leaderboard"),
      { params: Promise.resolve({ slug: "draft" }) },
    );
    expect(response.status).toBe(404);
  });

  it("never exposes email or proctoring fields and sets Cache-Control: no-store", async () => {
    mocks.findParticipants.mockResolvedValue([
      {
        userId: "user-1",
        score: 100,
        penaltyMinutes: 20,
        finishedAt: null,
        email: "secret@local.test",
        violationCount: 5,
        flaggedAt: new Date("2026-11-15T02:00:00Z"),
        user: { id: "user-1", name: "Minh Thư", email: "secret@local.test" },
      },
    ]);

    const response = await getSnapshotRoute(
      new NextRequest(
        "http://localhost/api/contests/sample-contest/leaderboard",
      ),
      { params: Promise.resolve({ slug: "sample-contest" }) },
    );
    const bodyText = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(bodyText).not.toContain("secret@local.test");
    expect(bodyText).not.toContain("violationCount");
    expect(bodyText).not.toContain("flaggedAt");
  });
});

describe("contest leaderboard SSE stream", () => {
  it("streams initial snapshot, pushes updated standings on event emission, and cleans up on abort", async () => {
    const controller = new AbortController();
    const request = new NextRequest(
      "http://localhost/api/contests/sample-contest/leaderboard/stream",
      { signal: controller.signal },
    );

    const response = await getStreamRoute(request, {
      params: Promise.resolve({ slug: "sample-contest" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "text/event-stream; charset=utf-8",
    );
    expect(response.headers.get("Cache-Control")).toBe(
      "no-store, no-cache, no-transform",
    );

    const reader = response.body?.getReader();
    expect(reader).toBeDefined();
    const decoder = new TextDecoder();

    const firstChunk = await reader!.read();
    const firstText = decoder.decode(firstChunk.value);
    expect(firstText).toContain("event: leaderboard");
    expect(firstText).toContain('"score":200');

    // Simulate updated DB row when another participant submits a new solution.
    mocks.findParticipants.mockResolvedValue([
      {
        userId: "user-1",
        score: 200,
        penaltyMinutes: 20,
        finishedAt: null,
        user: { id: "user-1", name: "Minh Thư" },
      },
      {
        userId: "user-2",
        score: 200,
        penaltyMinutes: 0,
        finishedAt: new Date("2026-11-15T02:00:00Z"),
        user: { id: "user-2", name: "Minh Anh" },
      },
    ]);

    emitContestLeaderboardUpdated("contest-1");

    const secondChunk = await reader!.read();
    const secondText = decoder.decode(secondChunk.value);
    expect(secondText).toContain("event: leaderboard");
    expect(secondText).toContain('"version":1');
    expect(secondText).toContain('"score":200');

    controller.abort();
    const ended = await reader!.read();
    expect(ended.done).toBe(true);
  });
});
