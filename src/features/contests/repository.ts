import { ContestStatus } from "@prisma/client";
import { db } from "@/lib/db";

const summary = {
  id: true,
  slug: true,
  title: true,
  description: true,
  startsAt: true,
  endsAt: true,
  penaltyMinutes: true,
  requireFaceCheck: true,
  _count: { select: { exercises: true, participants: true } },
} as const;

export function listContests() {
  return db.contest.findMany({
    where: { status: ContestStatus.PUBLISHED },
    select: summary,
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
  });
}

export function findPublishedContest(slug: string) {
  return db.contest.findFirst({
    where: { slug, status: ContestStatus.PUBLISHED },
    select: summary,
  });
}

export type ContestSummary = Awaited<ReturnType<typeof listContests>>[number];
