import { ContestStatus, RoleName } from "@prisma/client";
import { requireRole } from "@/features/auth/service";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { getContestLeaderboardVersion } from "./contest-events";
import {
  rankContestParticipantStandings,
  type ContestLeaderboardCandidate,
  type CurrentContestStanding,
  type RankedContestEntry,
} from "./contest-ranking";

export const DEFAULT_CONTEST_LEADERBOARD_LIMIT = 50;

export interface ContestLeaderboardInfo {
  id: string;
  slug: string;
  title: string;
  status: ContestStatus;
  penaltyMinutes: number;
  examStartsAt: string | null;
  examEndsAt: string | null;
  exerciseCount: number;
}

export interface ContestLeaderboardViewer {
  userId: string;
  contest: ContestLeaderboardInfo;
}

export interface ContestLeaderboardData {
  contest: ContestLeaderboardInfo;
  version: number;
  updatedAt: string;
  entries: RankedContestEntry[];
  totalParticipants: number;
  myStanding: CurrentContestStanding | null;
}

/**
 * Shared authorization check for page, JSON API, and SSE stream:
 * only a `STUDENT` registered in the contest (`PUBLISHED` or `FINISHED`) may view it.
 */
export async function assertContestLeaderboardViewer(
  slug: string,
): Promise<ContestLeaderboardViewer> {
  const user = await requireRole([RoleName.STUDENT]);

  const contest = await db.contest.findFirst({
    where: {
      slug,
      status: { in: [ContestStatus.PUBLISHED, ContestStatus.FINISHED] },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      penaltyMinutes: true,
      examStartsAt: true,
      examEndsAt: true,
      _count: { select: { exercises: true } },
    },
  });

  if (!contest) {
    throw new AppError(404, "CONTEST_NOT_FOUND", "Không tìm thấy cuộc thi.");
  }

  const registration = await db.contestParticipant.findUnique({
    where: {
      contestId_userId: { contestId: contest.id, userId: user.id },
    },
    select: { userId: true },
  });

  if (!registration) {
    throw new AppError(
      403,
      "NOT_REGISTERED",
      "Chỉ thí sinh đã đăng ký cuộc thi mới được xem bảng xếp hạng.",
    );
  }

  return {
    userId: user.id,
    contest: {
      id: contest.id,
      slug: contest.slug,
      title: contest.title,
      status: contest.status,
      penaltyMinutes: contest.penaltyMinutes,
      examStartsAt: contest.examStartsAt
        ? contest.examStartsAt.toISOString()
        : null,
      examEndsAt: contest.examEndsAt ? contest.examEndsAt.toISOString() : null,
      exerciseCount: contest._count.exercises,
    },
  };
}

/**
 * Loads ranked contest standings from `ContestParticipant.score` & `penaltyMinutes`.
 * Exposes only public participant fields (`userId`, `name`, `score`, `penaltyMinutes`, `finished`).
 */
export async function loadContestLeaderboardSnapshot(
  viewer: ContestLeaderboardViewer,
  options?: { limit?: number },
): Promise<ContestLeaderboardData> {
  const limit =
    options?.limit !== undefined
      ? Math.max(1, Math.min(200, Math.floor(options.limit)))
      : DEFAULT_CONTEST_LEADERBOARD_LIMIT;

  const rows = await db.contestParticipant.findMany({
    where: { contestId: viewer.contest.id },
    orderBy: [{ score: "desc" }, { penaltyMinutes: "asc" }, { userId: "asc" }],
    select: {
      userId: true,
      score: true,
      penaltyMinutes: true,
      finishedAt: true,
      user: { select: { id: true, name: true } },
    },
  });

  const candidates: ContestLeaderboardCandidate[] = rows.map((row) => ({
    userId: row.userId,
    name: row.user.name,
    score: row.score,
    penaltyMinutes: row.penaltyMinutes,
    finished: row.finishedAt !== null,
  }));

  const ranked = rankContestParticipantStandings(candidates, {
    currentUserId: viewer.userId,
    limit,
  });

  return {
    contest: viewer.contest,
    version: getContestLeaderboardVersion(viewer.contest.id),
    updatedAt: new Date().toISOString(),
    entries: ranked.entries,
    totalParticipants: ranked.totalParticipants,
    myStanding: ranked.myStanding,
  };
}

export async function getContestLeaderboard(
  slug: string,
  options?: { limit?: number },
): Promise<ContestLeaderboardData> {
  const viewer = await assertContestLeaderboardViewer(slug);
  return loadContestLeaderboardSnapshot(viewer, options);
}
