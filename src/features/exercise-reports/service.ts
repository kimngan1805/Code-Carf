import { RoleName } from "@prisma/client";
import { requireRole } from "@/features/auth/service";
import { canAccessRoom } from "@/features/rooms/access";
import { AppError } from "@/lib/errors";
import { reportSchema } from "./rules";
import { createExerciseReport, findReportExercise } from "./repository";

export async function reportExercise(exerciseId: string, input: unknown) {
  const user = await requireRole([RoleName.STUDENT]);
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success)
    throw new AppError(400, "INVALID_REPORT", parsed.error.issues[0].message);
  if (typeof exerciseId !== "string" || !exerciseId || exerciseId.length > 200)
    throw new AppError(400, "INVALID_REPORT", "Bài tập không hợp lệ.");
  const exercise = await findReportExercise(exerciseId);
  if (
    !exercise?.room ||
    !exercise.room.published ||
    !exercise.room.path.published ||
    exercise.room.path.deletedAt != null
  )
    throw new AppError(404, "EXERCISE_NOT_FOUND", "Không tìm thấy bài tập.");
  if (!(await canAccessRoom(user.id, exercise.room.id)))
    throw new AppError(
      403,
      "ROOM_LOCKED",
      "Bạn cần đăng ký lộ trình và mở khóa bài học trước khi báo lỗi.",
    );
  // Identity and Room come only from the session and database, never form fields.
  return createExerciseReport(
    user.id,
    exercise.id,
    exercise.room.id,
    parsed.data,
  );
}
