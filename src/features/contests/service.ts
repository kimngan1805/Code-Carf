import { RoleName } from "@prisma/client";
import { requireRole } from "@/features/auth/service";
import { AppError } from "@/lib/errors";
import {
  findPublishedContest,
  listContests,
  listRegisteredContestIds,
  findContestParticipant,
  registerContestParticipant,
} from "./repository";
import { loadStageState } from "./stage-repository";
import {
  assertParticipantCanEnter,
  assertRegistrationOpen,
  getAttemptDeadline,
} from "./access";
export async function getContests() {
  const user = await requireRole(Object.values(RoleName));
  const [contests, registeredIds] = await Promise.all([
    listContests(),
    listRegisteredContestIds(user.id),
  ]);
  const registered = new Set(registeredIds);
  return {
    contests: contests.map((contest) => ({
      ...contest,
      registered: registered.has(contest.id),
    })),
    serverNow: Date.now(),
  };
}

export async function getContest(slug: string) {
  const user = await requireRole(Object.values(RoleName));
  const contest = await findPublishedContest(slug);
  if (!contest)
    throw new AppError(404, "CONTEST_NOT_FOUND", "Không tìm thấy cuộc thi.");
  const participant = await findContestParticipant(contest.id, user.id);
  // Cuộc thi theo chặng: chặng hiện tại (tính cả chặng đã hết giờ) và thời gian từng chặng.
  const stageState = await loadStageState(contest.id, user.id);
  return {
    ...contest,
    stages: stageState.stages.map(({ number, durationMinutes }) => ({
      number,
      durationMinutes,
    })),
    currentStage: stageState.current?.number ?? null,
    participant: participant
      ? { ...participant, deadlineAt: getAttemptDeadline(contest, participant) }
      : null,
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
  return {
    contest,
    participant,
    deadlineAt: getAttemptDeadline(contest, participant)!,
    userId: user.id,
    serverNow,
  };
}
