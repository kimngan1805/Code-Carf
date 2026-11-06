import { RoleName } from "@prisma/client";
import { z } from "zod";
import { requireRole } from "@/features/auth/service";
import { AppError } from "@/lib/errors";
import {
  aggregateStudentXp,
  findPublishedPathForLeaderboard,
  listPublishedPathsForLeaderboard,
  listTopUsers,
  type PublishedPathOption,
} from "./repository";
import {
  getCurrentWeekRange,
  rankXpLeaderboard,
  type CurrentUserStanding,
  type LeaderboardPeriod,
  type RankedXpLearner,
  type WeekWindow,
} from "./xp-ranking";

export const DEFAULT_XP_LEADERBOARD_LIMIT = 50;

const xpLeaderboardInputSchema = z.object({
  period: z.enum(["week", "all"]).default("all"),
  pathSlug: z.string().trim().min(1).nullable().optional(),
  limit: z
    .number()
    .int()
    .positive()
    .max(100)
    .default(DEFAULT_XP_LEADERBOARD_LIMIT),
  now: z.date().optional(),
});

export interface GetXpLeaderboardInput {
  period?: LeaderboardPeriod | string;
  pathSlug?: string | null;
  limit?: number;
  now?: Date;
}

export interface XpLeaderboardView {
  period: LeaderboardPeriod;
  selectedPath: PublishedPathOption | null;
  paths: PublishedPathOption[];
  weekRange: WeekWindow | null;
  entries: RankedXpLearner[];
  totalRankedLearners: number;
  myStanding: CurrentUserStanding;
}

export async function getLeaderboard() {
  await requireRole(Object.values(RoleName));
  return listTopUsers();
}

export async function getXpLeaderboard(
  rawInput?: GetXpLeaderboardInput,
): Promise<XpLeaderboardView> {
  const user = await requireRole([RoleName.STUDENT]);

  const normalizedSlug =
    typeof rawInput?.pathSlug === "string"
      ? rawInput.pathSlug.trim() || null
      : (rawInput?.pathSlug ?? null);

  const parsed = xpLeaderboardInputSchema.safeParse({
    period: rawInput?.period,
    pathSlug: normalizedSlug,
    limit: rawInput?.limit,
    now: rawInput?.now,
  });

  if (!parsed.success) {
    throw new AppError(
      400,
      "INVALID_LEADERBOARD_FILTER",
      "Bộ lọc bảng xếp hạng không hợp lệ.",
    );
  }

  const { period, pathSlug, limit } = parsed.data;
  const referenceNow = parsed.data.now ?? new Date();

  let selectedPath: PublishedPathOption | null = null;
  if (pathSlug) {
    selectedPath = await findPublishedPathForLeaderboard(pathSlug);
    if (!selectedPath) {
      throw new AppError(404, "PATH_NOT_FOUND", "Không tìm thấy lộ trình.");
    }
  }

  const weekRange =
    period === "week" ? getCurrentWeekRange(referenceNow) : null;

  const [paths, candidates] = await Promise.all([
    listPublishedPathsForLeaderboard(),
    aggregateStudentXp({
      pathId: selectedPath?.id ?? null,
      ...(weekRange
        ? { startsAt: weekRange.startsAt, endsAt: weekRange.endsAt }
        : {}),
    }),
  ]);

  const ranked = rankXpLeaderboard(candidates, {
    currentUser: { id: user.id, name: user.name },
    limit,
  });

  return {
    period,
    selectedPath,
    paths,
    weekRange,
    entries: ranked.entries,
    totalRankedLearners: ranked.totalRankedLearners,
    myStanding: ranked.myStanding,
  };
}
