import { XpSource, type Prisma, type XpEvent } from "@prisma/client";
import { z } from "zod";
import { db } from "../../lib/db";
import { AppError } from "../../lib/errors";
import { awardActivityBadgesInTx } from "./badge-awarding";
import { computeNextStreak } from "./streak";

const activityInputSchema = z.object({
  userId: z.string().trim().min(1, "userId không được để trống"),
  xp: z.number().int("xp phải là số nguyên").positive("xp phải lớn hơn 0"),
  source: z.enum(XpSource),
  pathId: z.string().trim().min(1).nullable().optional(),
  roomId: z.string().trim().min(1).nullable().optional(),
  contestId: z.string().trim().min(1).nullable().optional(),
  occurredAt: z.date().optional(),
});

const streakInputSchema = z.object({
  userId: z.string().trim().min(1, "userId không được để trống"),
  occurredAt: z.date().optional(),
});

export interface RecordLearningActivityInput {
  userId: string;
  xp: number;
  source: XpSource;
  pathId?: string | null;
  roomId?: string | null;
  contestId?: string | null;
  occurredAt?: Date;
}

export interface RecordLearningActivityResult {
  xpEvent: XpEvent;
  xp: number;
}

export interface RecordStreakActivityInput {
  userId: string;
  occurredAt?: Date;
}

export interface RecordStreakActivityResult {
  currentStreak: number;
  longestStreak: number;
  lastActiveOn: Date;
  updated: boolean;
}

function parseActivityInput(input: RecordLearningActivityInput) {
  const parsed = activityInputSchema.safeParse(input);
  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ??
      "Dữ liệu hoạt động học tập không hợp lệ";
    throw new AppError(400, "INVALID_LEARNING_ACTIVITY", message);
  }
  return parsed.data;
}

function parseStreakInput(input: RecordStreakActivityInput) {
  const parsed = streakInputSchema.safeParse(input);
  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ??
      "Dữ liệu hoạt động học tập không hợp lệ";
    throw new AppError(400, "INVALID_LEARNING_ACTIVITY", message);
  }
  return parsed.data;
}

async function lockUserForStreakInTx(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<void> {
  // Lock the user row before writing XpEvent or User to serialize concurrent
  // streak transitions and avoid FOR KEY SHARE -> FOR UPDATE lock upgrades.
  await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
}

/**
 * Records an XP ledger event, increments the user's cached XP total, updates
 * the learning streak in `Asia/Ho_Chi_Minh`, and evaluates/awards eligible
 * activity milestone badges atomically inside the caller's transaction.
 */
export async function recordLearningActivityInTx(
  tx: Prisma.TransactionClient,
  input: RecordLearningActivityInput,
): Promise<RecordLearningActivityResult> {
  const { userId, xp, source, pathId, roomId, contestId, occurredAt } =
    parseActivityInput(input);

  await lockUserForStreakInTx(tx, userId);

  const xpEvent = await tx.xpEvent.create({
    data: {
      userId,
      amount: xp,
      source,
      pathId: pathId ?? null,
      roomId: roomId ?? null,
      contestId: contestId ?? null,
    },
  });

  const streakSnapshot = await tx.user.findUnique({
    where: { id: userId },
    select: {
      currentStreak: true,
      longestStreak: true,
      lastActiveOn: true,
    },
  });
  const nextStreak = streakSnapshot
    ? computeNextStreak(streakSnapshot, occurredAt ?? new Date())
    : null;

  const user = await tx.user.update({
    where: { id: userId },
    data: {
      xp: { increment: xp },
      ...(nextStreak?.changed
        ? {
            currentStreak: nextStreak.currentStreak,
            longestStreak: nextStreak.longestStreak,
            lastActiveOn: nextStreak.lastActiveOn,
          }
        : {}),
    },
    select: { xp: true },
  });

  await awardActivityBadgesInTx(tx, userId);

  return { xpEvent, xp: user.xp };
}

/**
 * Records an XP ledger event, increments the user's cached XP total, updates
 * streak, and awards eligible badges atomically inside a single transaction.
 */
export async function recordLearningActivity(
  input: RecordLearningActivityInput,
): Promise<RecordLearningActivityResult> {
  // Validate first so bad input never opens a transaction.
  parseActivityInput(input);
  return db.$transaction((tx) => recordLearningActivityInTx(tx, input));
}

/**
 * Updates the learner's streak and evaluates milestone badges without creating
 * an XP event or awarding XP (used for 0-XP rooms and practice submissions).
 */
export async function recordStreakActivityInTx(
  tx: Prisma.TransactionClient,
  input: RecordStreakActivityInput,
): Promise<RecordStreakActivityResult> {
  const { userId, occurredAt } = parseStreakInput(input);

  await lockUserForStreakInTx(tx, userId);

  const snapshot = await tx.user.findUnique({
    where: { id: userId },
    select: {
      currentStreak: true,
      longestStreak: true,
      lastActiveOn: true,
    },
  });
  if (!snapshot) {
    throw new AppError(404, "USER_NOT_FOUND", "Không tìm thấy người dùng");
  }

  const next = computeNextStreak(snapshot, occurredAt ?? new Date());
  if (next.changed) {
    await tx.user.update({
      where: { id: userId },
      data: {
        currentStreak: next.currentStreak,
        longestStreak: next.longestStreak,
        lastActiveOn: next.lastActiveOn,
      },
    });
  }

  await awardActivityBadgesInTx(tx, userId);

  return {
    currentStreak: next.currentStreak,
    longestStreak: next.longestStreak,
    lastActiveOn: next.lastActiveOn,
    updated: next.changed,
  };
}

/**
 * Updates the learner's streak and evaluates milestone badges atomically in a
 * standalone transaction without awarding XP.
 */
export async function recordStreakActivity(
  input: RecordStreakActivityInput,
): Promise<RecordStreakActivityResult> {
  const parsed = parseStreakInput(input);
  return db.$transaction((tx) => recordStreakActivityInTx(tx, parsed));
}
