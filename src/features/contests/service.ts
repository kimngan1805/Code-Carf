import { RoleName } from "@prisma/client";
import { requireRole } from "@/features/auth/service";
import { AppError } from "@/lib/errors";
import {
  findPublishedContest,
  listContests,
  findContestParticipant,
  registerContestParticipant,
} from "./repository";
import { assertParticipantCanEnter, assertRegistrationOpen } from "./access";
export async function getContests() {
  await requireRole(Object.values(RoleName));
  const contests = await listContests();
  return { contests, serverNow: Date.now() };
}

export async function getContest(slug: string) {
  const user = await requireRole(Object.values(RoleName));
  const contest = await findPublishedContest(slug);
  if (!contest)
    throw new AppError(404, "CONTEST_NOT_FOUND", "Không tìm thấy cuộc thi.");
  const participant = await findContestParticipant(contest.id, user.id);
  return {
    ...contest,
    participant,
    canParticipate: user.role.name === RoleName.STUDENT,
    serverNow: Date.now(),
  };
}

export async function registerForContest(slug: string) {
  const user = await requireRole([RoleName.STUDENT]);
  const contest = await findPublishedContest(slug);
  if (!contest)
    throw new AppError(404, "CONTEST_NOT_FOUND", "Không tìm thấy cuộc thi.");
  assertRegistrationOpen(contest, Date.now());
  return registerContestParticipant(contest.id, user.id);
}

export async function getContestEntry(slug: string) {
  const user = await requireRole([RoleName.STUDENT]);
  const contest = await findPublishedContest(slug);
  if (!contest)
    throw new AppError(404, "CONTEST_NOT_FOUND", "Không tìm thấy cuộc thi.");
  const participant = await findContestParticipant(contest.id, user.id);
  const serverNow = Date.now();
  assertParticipantCanEnter(contest, participant, serverNow);
  return { contest, userId: user.id, serverNow };
}
