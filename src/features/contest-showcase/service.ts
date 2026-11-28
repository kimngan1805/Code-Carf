import { AppError } from "@/lib/errors";
import {
  getContestPhase,
  getExamPhase,
  type ContestPhase,
} from "@/features/contests/time";
import { sampleContests, withProfile, type ShowcaseContest } from "./catalog";
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
function byPriority(a: PublicContest, b: PublicContest) {
  if (a.phase !== b.phase) return priority[a.phase] - priority[b.phase];
  const aTime = a.examStartsAt ? Date.parse(a.examStartsAt) : 0;
  const bTime = b.examStartsAt ? Date.parse(b.examStartsAt) : 0;
  return (
    (a.phase === "ended" ? bTime - aTime : aTime - bTime) ||
    a.slug.localeCompare(b.slug)
  );
}
export async function getPublicShowcase(now = Date.now()) {
  return (await listPublicContests())
    .map((contest) => presentPublicContest(contest, now))
    .sort(byPriority);
}
/** Cuộc thi thật kèm hồ sơ mặc định, cộng các cuộc thi mẫu để duyệt giao diện. */
export async function getShowcaseContests(
  now = Date.now(),
): Promise<ShowcaseContest[]> {
  const real = (await getPublicShowcase(now)).map(withProfile);
  // Mẫu đã được seed thành cuộc thi thật thì chỉ hiện bản thật để đăng ký được.
  const seeded = new Set(real.map((contest) => contest.slug));
  const samples = sampleContests(now).filter(
    (contest) => !seeded.has(contest.slug),
  );
  return [...real, ...samples].sort(byPriority);
}
export async function getShowcaseContest(
  slug: string,
  now = Date.now(),
): Promise<ShowcaseContest> {
  const contest = await findPublicContest(slug);
  if (contest) return withProfile(presentPublicContest(contest, now));
  const sample = sampleContests(now).find((item) => item.slug === slug);
  if (sample) return sample;
  throw new AppError(404, "CONTEST_NOT_FOUND", "Không tìm thấy cuộc thi.");
}
export async function getPublicContest(slug: string, now = Date.now()) {
  const contest = await findPublicContest(slug);
  if (!contest)
    throw new AppError(404, "CONTEST_NOT_FOUND", "Không tìm thấy cuộc thi.");
  return presentPublicContest(contest, now);
}
