export type RankableSubmissionStatus =
  "PENDING" | "RUNNING" | "NEEDS_REVIEW" | "ACCEPTED" | "REJECTED" | "ERROR";

/**
 * Minimal submission shape required to compute contest rankings.
 *
 * Contract: callers MUST supply submissions from a single contest only.
 * If `contestId` is provided on submissions (or via `options.contestId`),
 * practice submissions (`null`) and cross-contest batches are rejected.
 */
export interface RankableSubmission {
  userId: string;
  exerciseId: string;
  contestId?: string | null;
  status: RankableSubmissionStatus;
  score: number | null;
  createdAt: Date | number;
}

export interface AggregateContestScoresOptions {
  /** Optional contest scope guard; rejects submissions belonging to another contest. */
  contestId?: string;
  /** Registered participant IDs so users without valid submissions still appear with 0 points. */
  participantIds?: readonly string[];
}

export interface ExerciseBestScore {
  exerciseId: string;
  score: number;
  achievedAt: Date;
}

export interface ParticipantScoreSummary {
  userId: string;
  totalScore: number;
  /** Latest `achievedAt` among exercises with `score > 0`, or `null` when `totalScore === 0`. */
  achievedAt: Date | null;
  exerciseBests: Record<string, ExerciseBestScore>;
}

export interface RankedParticipant extends ParticipantScoreSummary {
  /** Standard competition rank (1, 1, 3) when tied on both `totalScore` and `achievedAt`. */
  rank: number;
}

interface InternalBest {
  score: number;
  timeMs: number;
}

const SCORED_STATUSES: ReadonlySet<RankableSubmissionStatus> = new Set([
  "ACCEPTED",
  "REJECTED",
]);

function isScoredSubmission(submission: RankableSubmission): boolean {
  return (
    SCORED_STATUSES.has(submission.status) &&
    submission.score !== null &&
    Number.isFinite(submission.score)
  );
}

function toTimestampMs(value: Date | number): number {
  const ms = value instanceof Date ? value.getTime() : value;
  if (!Number.isFinite(ms)) {
    throw new Error("Invalid submission createdAt timestamp");
  }
  return ms;
}

function assertSingleContestScope(
  submissions: readonly RankableSubmission[],
  expectedContestId?: string,
): void {
  let seenContestId = expectedContestId;

  for (const submission of submissions) {
    if (submission.contestId === undefined) continue;

    if (submission.contestId === null) {
      throw new Error(
        "Contest ranking only accepts contest submissions, got contestId=null",
      );
    }

    if (seenContestId === undefined) {
      seenContestId = submission.contestId;
      continue;
    }

    if (submission.contestId !== seenContestId) {
      throw new Error(
        `Contest ranking input must belong to a single contest (expected "${seenContestId}", got "${submission.contestId}")`,
      );
    }
  }
}

export function compareUserIds(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Pure generic helper that sorts items using `compareItems` and assigns
 * standard competition ranks (1, 1, 3) whenever consecutive sorted entries
 * satisfy `isSameRank`. Does not mutate `items`.
 */
export function rankWithCompetitionTies<T, R>(
  items: readonly T[],
  compareItems: (a: T, b: T) => number,
  isSameRank: (previous: T, current: T) => boolean,
  mapRanked: (item: T, rank: number) => R,
): R[] {
  const sorted = [...items].sort(compareItems);
  const ranked: R[] = [];
  let previousItem: T | null = null;
  let previousRank = 0;

  for (let index = 0; index < sorted.length; index += 1) {
    const entry = sorted[index];
    const isTie = previousItem !== null && isSameRank(previousItem, entry);
    const rank = isTie ? previousRank : index + 1;
    ranked.push(mapRanked(entry, rank));
    previousItem = entry;
    previousRank = rank;
  }

  return ranked;
}

function toNullableMs(date: Date | null): number | null {
  return date === null ? null : date.getTime();
}

function compareSummaries(
  a: ParticipantScoreSummary,
  b: ParticipantScoreSummary,
): number {
  if (a.totalScore !== b.totalScore) {
    return b.totalScore - a.totalScore;
  }

  const aTime = toNullableMs(a.achievedAt);
  const bTime = toNullableMs(b.achievedAt);
  if (aTime !== bTime) {
    if (aTime === null) return 1;
    if (bTime === null) return -1;
    return aTime - bTime;
  }

  return compareUserIds(a.userId, b.userId);
}

/**
 * Aggregates per-exercise best scores and total contest score for each participant
 * from a single contest's submissions.
 *
 * Rules:
 * - Only `ACCEPTED` and `REJECTED` submissions with non-null `score` are counted.
 * - Each `(userId, exerciseId)` keeps its highest score; ties keep the earliest `createdAt`.
 * - `totalScore` is the sum of each exercise's best score (no penalty applied).
 * - `achievedAt` is the latest `achievedAt` across exercises with `score > 0`, or `null` if `totalScore === 0`.
 */
export function aggregateContestScores(
  submissions: readonly RankableSubmission[],
  options?: AggregateContestScoresOptions,
): ParticipantScoreSummary[] {
  assertSingleContestScope(submissions, options?.contestId);

  const byUser = new Map<string, Map<string, InternalBest>>();

  for (const participantId of options?.participantIds ?? []) {
    if (!byUser.has(participantId)) {
      byUser.set(participantId, new Map());
    }
  }

  for (const submission of submissions) {
    if (!isScoredSubmission(submission)) continue;

    const score = Math.max(0, submission.score as number);
    const timeMs = toTimestampMs(submission.createdAt);

    let exercises = byUser.get(submission.userId);
    if (!exercises) {
      exercises = new Map();
      byUser.set(submission.userId, exercises);
    }

    const current = exercises.get(submission.exerciseId);
    if (
      !current ||
      score > current.score ||
      (score === current.score && timeMs < current.timeMs)
    ) {
      exercises.set(submission.exerciseId, { score, timeMs });
    }
  }

  const summaries: ParticipantScoreSummary[] = [];

  for (const [userId, exercises] of byUser) {
    let totalScore = 0;
    let latestPositiveMs: number | null = null;
    const exerciseBests: Record<string, ExerciseBestScore> = {};

    for (const [exerciseId, best] of exercises) {
      totalScore += best.score;
      if (
        best.score > 0 &&
        (latestPositiveMs === null || best.timeMs > latestPositiveMs)
      ) {
        latestPositiveMs = best.timeMs;
      }
      exerciseBests[exerciseId] = {
        exerciseId,
        score: best.score,
        achievedAt: new Date(best.timeMs),
      };
    }

    summaries.push({
      userId,
      totalScore,
      achievedAt:
        totalScore > 0 && latestPositiveMs !== null
          ? new Date(latestPositiveMs)
          : null,
      exerciseBests,
    });
  }

  return summaries;
}

function cloneExerciseBests(
  bests: Record<string, ExerciseBestScore>,
): Record<string, ExerciseBestScore> {
  const cloned: Record<string, ExerciseBestScore> = {};
  for (const [exerciseId, best] of Object.entries(bests)) {
    cloned[exerciseId] = {
      exerciseId: best.exerciseId,
      score: best.score,
      achievedAt: new Date(best.achievedAt.getTime()),
    };
  }
  return cloned;
}

/**
 * Sorts participant score summaries and assigns competition ranks (1, 1, 3).
 *
 * Order:
 * 1. `totalScore` descending
 * 2. `achievedAt` ascending (`null` after non-null timestamps)
 * 3. `userId` ascending (deterministic tie-breaker without changing shared rank)
 */
export function rankContestParticipants(
  summaries: readonly ParticipantScoreSummary[],
): RankedParticipant[] {
  return rankWithCompetitionTies(
    summaries,
    compareSummaries,
    (previous, entry) =>
      previous.totalScore === entry.totalScore &&
      toNullableMs(previous.achievedAt) === toNullableMs(entry.achievedAt),
    (entry, rank) => ({
      userId: entry.userId,
      totalScore: entry.totalScore,
      achievedAt: entry.achievedAt
        ? new Date(entry.achievedAt.getTime())
        : null,
      exerciseBests: cloneExerciseBests(entry.exerciseBests),
      rank,
    }),
  );
}

/**
 * Pure end-to-end contest leaderboard calculation from single-contest submissions.
 */
export function computeContestLeaderboard(
  submissions: readonly RankableSubmission[],
  options?: AggregateContestScoresOptions,
): RankedParticipant[] {
  return rankContestParticipants(aggregateContestScores(submissions, options));
}
