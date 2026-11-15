import {
  aggregateContestScores,
  compareUserIds,
  rankWithCompetitionTies,
  type RankableSubmission,
} from "./ranking";

export interface ContestParticipantStandingSync {
  score: number;
  penaltyMinutes: number;
}

/**
 * Recomputes a single participant's aggregate score and penalty minutes from all
 * submissions in that contest so retries never double-count.
 *
 * Rules:
 * - Score reuses `#34` (`aggregateContestScores`: best `ACCEPTED`/`REJECTED` per exercise).
 * - Only `REJECTED` submissions incur `contestPenaltyMinutes` (including partial score).
 * - `ERROR` (system grading failures), `PENDING`, `RUNNING`, and `ACCEPTED` incur 0 penalty.
 */
export function computeContestParticipantStanding(
  submissions: readonly RankableSubmission[],
  contestPenaltyMinutes: number,
  contestId?: string,
): ContestParticipantStandingSync {
  const perSubmitPenalty = Math.max(0, Math.floor(contestPenaltyMinutes));
  const summaries = aggregateContestScores(
    submissions,
    contestId ? { contestId } : undefined,
  );
  const totalScore = summaries.reduce(
    (sum, summary) => sum + summary.totalScore,
    0,
  );

  const rejectedCount = submissions.reduce(
    (count, submission) =>
      submission.status === "REJECTED" ? count + 1 : count,
    0,
  );

  return {
    score: totalScore,
    penaltyMinutes: rejectedCount * perSubmitPenalty,
  };
}

export interface ContestLeaderboardCandidate {
  userId: string;
  name: string;
  score: number;
  penaltyMinutes: number;
  finished: boolean;
}

export interface RankedContestEntry {
  rank: number;
  userId: string;
  name: string;
  score: number;
  penaltyMinutes: number;
  finished: boolean;
  isCurrentUser: boolean;
}

export interface CurrentContestStanding {
  userId: string;
  name: string;
  score: number;
  penaltyMinutes: number;
  rank: number | null;
  inTop: boolean;
}

export interface RankContestStandingsOptions {
  currentUserId: string;
  limit?: number;
}

export interface RankedContestStandingsResult {
  entries: RankedContestEntry[];
  totalParticipants: number;
  myStanding: CurrentContestStanding | null;
}

function compareContestStandings(
  a: ContestLeaderboardCandidate,
  b: ContestLeaderboardCandidate,
): number {
  if (a.score !== b.score) {
    return b.score - a.score;
  }
  if (a.penaltyMinutes !== b.penaltyMinutes) {
    return a.penaltyMinutes - b.penaltyMinutes;
  }
  return compareUserIds(a.userId, b.userId);
}

/**
 * Pure competition ranking (`1, 1, 3`) over `ContestParticipant` rows:
 * 1. `score` descending
 * 2. `penaltyMinutes` ascending
 * 3. `userId` ascending (deterministic order without changing shared rank)
 */
export function rankContestParticipantStandings(
  candidates: readonly ContestLeaderboardCandidate[],
  options: RankContestStandingsOptions,
): RankedContestStandingsResult {
  const allRanked = rankWithCompetitionTies(
    candidates,
    compareContestStandings,
    (previous, current) =>
      previous.score === current.score &&
      previous.penaltyMinutes === current.penaltyMinutes,
    (entry, rank): RankedContestEntry => ({
      rank,
      userId: entry.userId,
      name: entry.name,
      score: entry.score,
      penaltyMinutes: entry.penaltyMinutes,
      finished: entry.finished,
      isCurrentUser: entry.userId === options.currentUserId,
    }),
  );

  const entries =
    options.limit !== undefined
      ? allRanked.slice(0, Math.max(0, options.limit))
      : allRanked;

  const currentMatch = allRanked.find(
    (entry) => entry.userId === options.currentUserId,
  );
  const inTop = entries.some((entry) => entry.userId === options.currentUserId);

  const myStanding: CurrentContestStanding | null = currentMatch
    ? {
        userId: currentMatch.userId,
        name: currentMatch.name,
        score: currentMatch.score,
        penaltyMinutes: currentMatch.penaltyMinutes,
        rank: currentMatch.rank,
        inTop,
      }
    : null;

  return {
    entries,
    totalParticipants: allRanked.length,
    myStanding,
  };
}
