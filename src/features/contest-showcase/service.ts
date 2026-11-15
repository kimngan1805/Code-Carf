import { AppError } from "@/lib/errors";
import {
  getContestPhase,
  getExamPhase,
  type ContestPhase,
} from "@/features/contests/time";
import {
  findPublicContest,
  listPublicContests,
  type PublicContestRecord,
} from "./repository";

export function presentPublicContest(
  contest: PublicContestRecord,
  now: number,
) {
  return {
    slug: contest.slug,
    title: contest.title,
    description: contest.description,
    registrationOpensAt: contest.startsAt?.toISOString() ?? null,
    registrationClosesAt: contest.endsAt?.toISOString() ?? null,
    examStartsAt: contest.examStartsAt?.toISOString() ?? null,
    examEndsAt: contest.examEndsAt?.toISOString() ?? null,
    durationMinutes: contest.durationMinutes,
    exercises: contest._count.exercises,
    participants: contest._count.participants,
    phase: getExamPhase(contest, now),
    registrationPhase: getContestPhase(contest, now),
  };
}
export type PublicContest = ReturnType<typeof presentPublicContest>;
const priority: Record<ContestPhase, number> = {
  live: 0,
  upcoming: 1,
  unscheduled: 2,
  ended: 3,
};
export async function getPublicShowcase(now = Date.now()) {
  return (await listPublicContests())
    .map((contest) => presentPublicContest(contest, now))
    .sort((a, b) => {
      if (a.phase !== b.phase) return priority[a.phase] - priority[b.phase];
      const aTime = a.examStartsAt ? Date.parse(a.examStartsAt) : 0;
      const bTime = b.examStartsAt ? Date.parse(b.examStartsAt) : 0;
      return (
        (a.phase === "ended" ? bTime - aTime : aTime - bTime) ||
        a.slug.localeCompare(b.slug)
      );
    });
}
export async function getPublicContest(slug: string, now = Date.now()) {
  const contest = await findPublicContest(slug);
  if (!contest)
    throw new AppError(404, "CONTEST_NOT_FOUND", "Không tìm thấy cuộc thi.");
  return presentPublicContest(contest, now);
}
