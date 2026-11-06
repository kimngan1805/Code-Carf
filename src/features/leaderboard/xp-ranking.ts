export {
  getCurrentWeekRange,
  type WeekWindow,
} from "@/features/progress/week-activity";
import { compareUserIds, rankWithCompetitionTies } from "./ranking";

export type LeaderboardPeriod = "week" | "all";

export interface XpLeaderboardCandidate {
  userId: string;
  name: string;
  xp: number;
}

export interface RankedXpLearner {
  rank: number;
  userId: string;
  name: string;
  xp: number;
  isCurrentUser: boolean;
}

export interface CurrentUserStanding {
  userId: string;
  name: string;
  xp: number;
  rank: number | null;
  inTop: boolean;
}

export interface RankXpLeaderboardOptions {
  currentUser: { id: string; name: string };
  limit?: number;
}

export interface RankedXpLeaderboardResult {
  entries: RankedXpLearner[];
  totalRankedLearners: number;
  myStanding: CurrentUserStanding;
}

/**
 * Pure XP leaderboard ranking using the shared competition ranking rule (1, 1, 3).
 * Learners with total XP `<= 0` in the target scope are excluded from ranked rows,
 * while still resolving `myStanding` for the current learner.
 */
export function rankXpLeaderboard(
  candidates: readonly XpLeaderboardCandidate[],
  options: RankXpLeaderboardOptions,
): RankedXpLeaderboardResult {
  const positiveCandidates = candidates
    .filter((candidate) => Number.isFinite(candidate.xp) && candidate.xp > 0)
    .map((candidate) => ({
      userId: candidate.userId,
      name: candidate.name,
      xp: candidate.xp,
    }));

  const allRanked = rankWithCompetitionTies(
    positiveCandidates,
    (a, b) => b.xp - a.xp || compareUserIds(a.userId, b.userId),
    (previous, current) => previous.xp === current.xp,
    (entry, rank): RankedXpLearner => ({
      rank,
      userId: entry.userId,
      name: entry.name,
      xp: entry.xp,
      isCurrentUser: entry.userId === options.currentUser.id,
    }),
  );

  const entries =
    options.limit !== undefined
      ? allRanked.slice(0, Math.max(0, options.limit))
      : allRanked;

  const currentMatch = allRanked.find(
    (entry) => entry.userId === options.currentUser.id,
  );
  const inTop = entries.some(
    (entry) => entry.userId === options.currentUser.id,
  );

  const myStanding: CurrentUserStanding = currentMatch
    ? {
        userId: currentMatch.userId,
        name: currentMatch.name,
        xp: currentMatch.xp,
        rank: currentMatch.rank,
        inTop,
      }
    : {
        userId: options.currentUser.id,
        name: options.currentUser.name,
        xp: 0,
        rank: null,
        inTop: false,
      };

  return {
    entries,
    totalRankedLearners: allRanked.length,
    myStanding,
  };
}
