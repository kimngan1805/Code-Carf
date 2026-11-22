import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { REPORT_COOLDOWN_MS, type ReportInput } from "./rules";

export function findReportExercise(exerciseId: string) {
  return db.exercise.findUnique({
    where: { id: exerciseId },
    select: {
      id: true,
      room: {
        select: {
          id: true,
          path: { select: { published: true, deletedAt: true } },
        },
      },
    },
  });
}

/** The per-user/exercise lock makes the rolling limit hold across tabs and app instances. */
export function createExerciseReport(
  userId: string,
  exerciseId: string,
  roomId: string,
  input: ReportInput,
) {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}), hashtext(${exerciseId}))`;
    const now = new Date();
    const recent = await tx.exerciseReport.findFirst({
      where: {
        userId,
        exerciseId,
        createdAt: { gt: new Date(now.getTime() - REPORT_COOLDOWN_MS) },
      },
      select: { id: true },
    });
    if (recent)
      throw new AppError(
        429,
        "REPORT_RATE_LIMITED",
        "Mỗi bài tập chỉ gửi được một báo cáo trong 5 phút. Vui lòng thử lại sau.",
      );
    // Detect a concurrent move/deletion rather than attach a report to an old Room.
    const exercise = await tx.exercise.findFirst({
      where: {
        id: exerciseId,
        roomId,
        room: { path: { published: true, deletedAt: null } },
      },
      select: { id: true },
    });
    if (!exercise)
      throw new AppError(
        404,
        "EXERCISE_NOT_FOUND",
        "Bài tập đã thay đổi hoặc không còn khả dụng. Vui lòng tải lại trang.",
      );
    return tx.exerciseReport.create({
      data: {
        userId,
        exerciseId,
        roomId,
        kind: input.kind,
        description: input.description,
        createdAt: now,
      },
      select: { id: true },
    });
  });
}
