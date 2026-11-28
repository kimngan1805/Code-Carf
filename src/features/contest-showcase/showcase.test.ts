import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  many: vi.fn(),
  first: vi.fn(),
  auth: vi.fn(),
  connection: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));
vi.mock("@/lib/db", () => ({
  db: { contest: { findMany: mocks.many, findFirst: mocks.first } },
}));
vi.mock("@/features/auth/service", () => ({ requireRole: mocks.auth }));
vi.mock("next/server", () => ({ connection: mocks.connection }));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
import {
  getShowcaseContest,
  getShowcaseContests,
  getPublicShowcase,
  getPublicContest,
  presentPublicContest,
} from "./service";
import { filterShowcase } from "./gallery";
import PublicContestPage from "@/app/thi-dau/[slug]/page";
import type { PublicContestRecord } from "./repository";

const now = Date.UTC(2026, 10, 16, 5);
function record(slug: string, offset: number | null = 0): PublicContestRecord {
  return {
    slug,
    title: "Đấu trường lập trình",
    description: "Public description",
    startsAt: new Date(now - 10000),
    endsAt: new Date(now - 1000),
    examStartsAt: offset === null ? null : new Date(now + offset),
    examEndsAt: offset === null ? null : new Date(now + offset + 1000),
    durationMinutes: 60,
    _count: { exercises: 3, participants: 5 },
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.many.mockResolvedValue([]);
  mocks.first.mockResolvedValue(null);
  mocks.auth.mockRejectedValue(new Error("Sign in required"));
});
it("lets anonymous guests read published metadata without requiring authentication", async () => {
  mocks.many.mockResolvedValue([record("live", -1)]);
  const contests = await getPublicShowcase(now);
  expect(contests).toHaveLength(1);
  expect(mocks.auth).not.toHaveBeenCalled();
  const query = mocks.many.mock.calls[0][0];
  expect(query.where).toEqual({ status: "PUBLISHED" });
  expect(Object.keys(query.select).sort()).toEqual(
    [
      "slug",
      "title",
      "description",
      "startsAt",
      "endsAt",
      "examStartsAt",
      "examEndsAt",
      "durationMinutes",
      "_count",
    ].sort(),
  );
  expect(query.select._count).toEqual({
    select: { exercises: true, participants: true },
  });
  expect(contests[0]).not.toHaveProperty("participants.0");
  expect(contests[0]).not.toHaveProperty("creatorId");
  expect(contests[0]).not.toHaveProperty("testCases");
});
it("keeps registration dates and exam phase separate", () => {
  const contest = presentPublicContest(record("future", 1000), now);
  expect(contest.registrationPhase).toBe("ended");
  expect(contest.phase).toBe("upcoming");
  expect(contest.registrationClosesAt).toBe(new Date(now - 1000).toISOString());
  expect(contest.examStartsAt).toBe(new Date(now + 1000).toISOString());
  expect(contest.durationMinutes).toBe(60);
});
it("prioritizes live and upcoming events, then unscheduled and recent ended contests", async () => {
  mocks.many.mockResolvedValue([
    record("old-ended", -10000),
    record("far-upcoming", 10000),
    record("unscheduled", null),
    record("live", -1),
    record("near-upcoming", 2000),
    record("recent-ended", -2000),
  ]);
  expect((await getPublicShowcase(now)).map((contest) => contest.slug)).toEqual(
    [
      "live",
      "near-upcoming",
      "far-upcoming",
      "unscheduled",
      "recent-ended",
      "old-ended",
    ],
  );
});
it("handles the exact exam start/end boundaries and absent schedules", () => {
  expect(presentPublicContest(record("start", 0), now).phase).toBe("live");
  expect(presentPublicContest(record("end", -1000), now).phase).toBe("ended");
  expect(presentPublicContest(record("none", null), now)).toMatchObject({
    phase: "unscheduled",
    examStartsAt: null,
    examEndsAt: null,
  });
});
it("returns only explicitly selected fields even if the input contains private values", () => {
  const source = {
    ...record("safe"),
    creatorId: "PRIVATE",
    exercises: [{ prompt: "SECRET" }],
    submissions: [{ code: "SECRET" }],
  };
  expect(JSON.stringify(presentPublicContest(source, now))).not.toMatch(
    /SECRET|PRIVATE|submissions|creatorId/,
  );
});
it("serves public details and hides drafts or unknown slugs", async () => {
  mocks.first.mockResolvedValueOnce(record("safe"));
  await expect(getPublicContest("safe", now)).resolves.toMatchObject({
    slug: "safe",
  });
  expect(mocks.first.mock.calls[0][0].where).toEqual({
    slug: "safe",
    status: "PUBLISHED",
  });
  await expect(getPublicContest("draft", now)).rejects.toMatchObject({
    status: 404,
  });
  expect(mocks.auth).not.toHaveBeenCalled();
});
it("maps unavailable public detail pages to Next.js notFound", async () => {
  await expect(
    PublicContestPage({ params: Promise.resolve({ slug: "draft" }) }),
  ).rejects.toThrow("NOT_FOUND");
  expect(mocks.notFound).toHaveBeenCalledOnce();
});
it("renders empty published catalogs without fabricated sample events", async () => {
  await expect(getPublicShowcase(now)).resolves.toEqual([]);
});
it("filters by exam status and searches Vietnamese titles without accents", () => {
  const contests = [
    presentPublicContest(record("live", -1), now),
    presentPublicContest(record("future", 2000), now),
    presentPublicContest(record("none", null), now),
  ];
  expect(
    filterShowcase(contests, "upcoming", " DAU TRUONG ").map(
      (contest) => contest.slug,
    ),
  ).toEqual(["future"]);
  expect(filterShowcase(contests, "all", "đấu trường")).toHaveLength(3);
  expect(filterShowcase(contests, "all", "missing")).toEqual([]);
  expect(filterShowcase(contests, "ended", "")).toEqual([]);
});
it("shows a seeded sample once, as the real registrable contest", async () => {
  mocks.many.mockResolvedValue([record("giao-huu-python", 1000)]);
  const contests = await getShowcaseContests(now);
  const matches = contests.filter((c) => c.slug === "giao-huu-python");
  expect(matches).toHaveLength(1);
  expect(matches[0].sample).toBe(false);
  expect(matches[0].participants).toBe(5);
});
it("prefers the database contest over a sample with the same slug", async () => {
  mocks.first.mockResolvedValue(record("giao-huu-python", 1000));
  const contest = await getShowcaseContest("giao-huu-python", now);
  expect(contest.sample).toBe(false);
  mocks.first.mockResolvedValue(null);
  expect((await getShowcaseContest("giao-huu-python", now)).sample).toBe(true);
});
