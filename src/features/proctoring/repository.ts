import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { assertParticipantCanEnter } from "@/features/contests/access";
import {
  EVENT_RATE_LIMIT,
  EVENT_RATE_WINDOW_MS,
  type ProctoringEventInput,
} from "./schema";

export async function recordProctoringEvent(
  slug: string,
  userId: string,
  input: ProctoringEventInput,
) {
  return db.$transaction(async (tx) => {
    const contest = await tx.contest.findUnique({ where: { slug } });
    if (!contest || contest.status !== "PUBLISHED")
      throw new AppError(404, "CONTEST_NOT_FOUND", "Không tìm thấy cuộc thi.");
    // The same participant lock as submissions/finalization serializes rate checks and expiry.
    await tx.$queryRaw`SELECT "userId" FROM "ContestParticipant" WHERE "contestId" = ${contest.id} AND "userId" = ${userId} FOR UPDATE`;
    const participant = await tx.contestParticipant.findUnique({
      where: { contestId_userId: { contestId: contest.id, userId } },
    });
    assertParticipantCanEnter(contest, participant, Date.now());
    const existing = await tx.proctoringEvent.findUnique({
      where: {
        contestId_userId_clientEventId: {
          contestId: contest.id,
          userId,
          clientEventId: input.clientEventId,
        },
      },
      select: { id: true },
    });
    if (existing) return { eventId: existing.id, duplicate: true };
    const count = await tx.proctoringEvent.count({
      where: {
        contestId: contest.id,
        userId,
        createdAt: { gte: new Date(Date.now() - EVENT_RATE_WINDOW_MS) },
      },
    });
    if (count >= EVENT_RATE_LIMIT)
      throw new AppError(
        429,
        "PROCTORING_RATE_LIMIT",
        "Đã đạt giới hạn gửi sự kiện. Bạn vẫn có thể tiếp tục làm bài.",
      );
    assertParticipantCanEnter(contest, participant, Date.now());
    const event = await tx.proctoringEvent.create({
      data: {
        contestId: contest.id,
        userId,
        clientEventId: input.clientEventId,
        type: input.type,
        // Browser time is diagnostic only. createdAt always comes from the server.
        metadata: {
          clientOccurredAt: input.occurredAt,
          ...(input.type === "PASTE" ? { pasteLength: input.pasteLength } : {}),
        },
      },
      select: { id: true },
    });
    return { eventId: event.id, duplicate: false };
  });
}
