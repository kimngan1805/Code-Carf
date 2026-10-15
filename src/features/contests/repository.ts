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

export function findContestParticipant(contestId: string, userId: string) {
  return db.contestParticipant.findUnique({
    where: { contestId_userId: { contestId, userId } },
    select: { joinedAt: true, finishedAt: true, faceVerifiedAt: true },
  });
}

export function registerContestParticipant(contestId: string, userId: string) {
  // The compound primary key and native upsert also cover simultaneous requests.
  return db.contestParticipant.upsert({
    where: { contestId_userId: { contestId, userId } },
    create: { contestId, userId },
    update: {},
    select: { joinedAt: true, finishedAt: true, faceVerifiedAt: true },
  });
}
