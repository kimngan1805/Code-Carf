import { XpSource, type Prisma, type XpEvent } from "@prisma/client";
import { z } from "zod";
import { db } from "../../lib/db";
import { AppError } from "../../lib/errors";
import { awardActivityBadgesInTx } from "./badge-awarding";

const activityInputSchema = z.object({
  userId: z.string().trim().min(1, "userId không được để trống"),
  xp: z.number().int("xp phải là số nguyên").positive("xp phải lớn hơn 0"),
  source: z.enum(XpSource),
  pathId: z.string().trim().min(1).nullable().optional(),
  roomId: z.string().trim().min(1).nullable().optional(),
  contestId: z.string().trim().min(1).nullable().optional(),
});

export interface RecordLearningActivityInput {
  userId: string;
  xp: number;
  source: XpSource;
  pathId?: string | null;
  roomId?: string | null;
  contestId?: string | null;
}

export interface RecordLearningActivityResult {
  xpEvent: XpEvent;
  xp: number;
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

/**
 * Records an XP ledger event, increments the user's cached XP total, and
 * evaluates/awards eligible activity milestone badges atomically inside the
 * caller's transaction. Use it when the XP must commit or roll back together
 * with other writes (for example completing a room); everyone else should call
 * `recordLearningActivity`.
 *
 * Streak updates (#22) will be wired inside this transaction before badge
 * evaluation in a follow-up task.
 */
export async function recordLearningActivityInTx(
  tx: Prisma.TransactionClient,
  input: RecordLearningActivityInput,
): Promise<RecordLearningActivityResult> {
  const { userId, xp, source, pathId, roomId, contestId } =
    parseActivityInput(input);

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

  const user = await tx.user.update({
    where: { id: userId },
    data: { xp: { increment: xp } },
    select: { xp: true },
  });

  await awardActivityBadgesInTx(tx, userId);

  return { xpEvent, xp: user.xp };
}

/**
 * Records an XP ledger event, increments the user's cached XP total, and
 * awards eligible badges atomically inside a single Prisma transaction.
 */
export async function recordLearningActivity(
  input: RecordLearningActivityInput,
): Promise<RecordLearningActivityResult> {
  // Validate first so bad input never opens a transaction.
  parseActivityInput(input);
  return db.$transaction((tx) => recordLearningActivityInTx(tx, input));
}
