import { db } from "@/lib/db";

// Public metadata only: never select statements, test cases or participant records.
const publicSelection = {
  slug: true,
  title: true,
  description: true,
  startsAt: true,
  endsAt: true,
  examStartsAt: true,
  examEndsAt: true,
  durationMinutes: true,
  _count: { select: { exercises: true, participants: true } },
} as const;

export function listPublicContests() {
  return db.contest.findMany({
    where: { status: "PUBLISHED" },
    select: publicSelection,
    orderBy: [{ examStartsAt: "asc" }, { slug: "asc" }],
  });
}
export function findPublicContest(slug: string) {
  return db.contest.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: publicSelection,
  });
}
export type PublicContestRecord = Awaited<
  ReturnType<typeof listPublicContests>
>[number];
