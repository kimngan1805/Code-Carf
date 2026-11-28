import { ExerciseKind, SubmissionStatus, XpSource } from "@prisma/client";
import { db } from "../../lib/db";
import { getLevel } from "../progress/levels";
import {
  recordLearningActivityInTx,
  recordStreakActivityInTx,
} from "../progress/activity";

export interface RoomCompletion {
  roomId: string;
  roomTitle: string;
  /** XP given for finishing the room (0 when the room has no reward). */
  xpAwarded: number;
  totalXp: number;
  level: number;
  previousLevel: number;
  leveledUp: boolean;
  /** The room that opens next in the same path, if there is one. */
  nextRoom: { id: string; title: string } | null;
}

/**
 * Completes a room for a learner once every exercise in it has an accepted
 * practice submission (contest submissions do not count, same as the room page).
 *
 * Progress, the XP event, the cached XP total and badges are written in ONE
 * transaction, so a failure part-way leaves nothing behind. Completion is
 * idempotent: the `(userId, roomId)` primary key of `RoomProgress` decides who
 * completes the room, and only that caller awards XP. Resubmitting, or two
 * accepted submissions finishing at the same moment, never pays twice.
 *
 * The next room needs no extra write: `canAccessRoom` reads `RoomProgress`
 * fresh, so it unlocks as soon as this transaction commits.
 *
 * Returns null when the room is not finished yet or was already completed.
 */
export async function completeRoomIfDone(
  userId: string,
  roomId: string,
  /** Bài học chỉ có nội dung (không có bài tập): học viên tự bấm "Đã học xong". */
  options: { markRead?: boolean } = {},
): Promise<RoomCompletion | null> {
  return db.$transaction(async (tx) => {
    const room = await tx.room.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        title: true,
        pathId: true,
        position: true,
        xpReward: true,
        exercises: { select: { id: true } },
      },
    });
    if (!room) return null;
    // Bài không có bài tập chỉ hoàn thành khi học viên tự đánh dấu đã học xong.
    if (room.exercises.length === 0 && !options.markRead) return null;

    const exerciseIds = room.exercises.map((exercise) => exercise.id);
    const passed = exerciseIds.length
      ? await tx.submission.findMany({
          where: {
            userId,
            contestId: null,
            exerciseId: { in: exerciseIds },
            OR: [
              { status: SubmissionStatus.ACCEPTED },
              // Bài tự luận: nộp ảnh là đã làm. Điểm do giảng viên chấm sau,
              // không chặn việc mở bài tiếp theo.
              {
                exercise: { kind: ExerciseKind.HANDWRITTEN },
                status: { not: SubmissionStatus.ERROR },
              },
            ],
          },
          select: { exerciseId: true },
          distinct: ["exerciseId"],
        })
      : [];
    if (passed.length < exerciseIds.length) return null;

    // ON CONFLICT DO NOTHING: a repeat or concurrent completion inserts nothing
    // (and does not abort the transaction), so it cannot award XP again.
    const created = await tx.roomProgress.createMany({
      data: [{ userId, roomId }],
      skipDuplicates: true,
    });
    if (created.count === 0) return null;

    const xpAwarded = Math.max(0, room.xpReward);
    let totalXp: number;
    if (xpAwarded > 0) {
      totalXp = (
        await recordLearningActivityInTx(tx, {
          userId,
          xp: xpAwarded,
          source: XpSource.ROOM_COMPLETED,
          pathId: room.pathId,
          roomId,
        })
      ).xp;
    } else {
      // A reward of 0 still completes the room and updates streak/badges,
      // without creating an XpEvent or awarding XP.
      await recordStreakActivityInTx(tx, { userId });
      totalXp = (
        await tx.user.findUniqueOrThrow({
          where: { id: userId },
          select: { xp: true },
        })
      ).xp;
    }

    const nextRoom = await tx.room.findFirst({
      where: {
        pathId: room.pathId,
        published: true,
        position: { gt: room.position },
      },
      orderBy: { position: "asc" },
      select: { id: true, title: true },
    });

    const level = getLevel(totalXp).level;
    const previousLevel = getLevel(totalXp - xpAwarded).level;
    return {
      roomId,
      roomTitle: room.title,
      xpAwarded,
      totalXp,
      level,
      previousLevel,
      leveledUp: level > previousLevel,
      nextRoom,
    };
  });
}
