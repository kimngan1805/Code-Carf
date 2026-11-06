import { XpSource, type XpEvent } from "@prisma/client";
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

/**
 * Records an XP ledger event, increments the user's cached XP total, and
 * evaluates/awards eligible activity milestone badges atomically inside a
 * single Prisma transaction.
 *
 * Streak updates (#22) will be wired inside this transaction before badge
 * evaluation in a follow-up task.
 */
export async function recordLearningActivity(
  input: RecordLearningActivityInput,
): Promise<RecordLearningActivityResult> {
  const parsed = activityInputSchema.safeParse(input);
  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ??
      "Dữ liệu hoạt động học tập không hợp lệ";
    throw new AppError(400, "INVALID_LEARNING_ACTIVITY", message);
  }

  const { userId, xp, source, pathId, roomId, contestId } = parsed.data;

  return db.$transaction(async (tx) => {
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
  });
}
