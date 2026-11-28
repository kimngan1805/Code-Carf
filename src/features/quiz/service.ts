import { ExerciseKind, RoleName, SubmissionStatus } from "@prisma/client";
import { z } from "zod";
import { requireRole } from "@/features/auth/service";
import { completeRoomIfDone } from "@/features/grading/room-completion";
import { recordStreakActivity } from "@/features/progress/activity";
import { canAccessRoom } from "@/features/rooms/access";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { gradeQuiz } from "./grading";

const bodySchema = z
  .object({
    exerciseId: z.string().min(1).max(200),
    answers: z.array(z.number().int().min(-1).max(20)).max(100),
  })
  .strict();

const NOT_FOUND = () =>
  new AppError(404, "EXERCISE_NOT_FOUND", "Không tìm thấy bài tập.");

/**
 * Chấm một lượt làm trắc nghiệm ở chế độ luyện tập. Người làm luôn lấy từ phiên
 * đăng nhập; đáp án đúng chỉ đọc ở server và chỉ trả về sau khi đã nộp.
 * Đạt (từ 70% câu đúng) thì được tính như bài code được chấp nhận: có thể hoàn
 * thành bài học và mở bài tiếp theo.
 */
export async function submitQuiz(body: unknown) {
  const user = await requireRole([RoleName.STUDENT]);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success)
    throw new AppError(400, "INVALID_SUBMISSION", "Bài làm không hợp lệ.");
  const exercise = await db.exercise.findUnique({
    where: { id: parsed.data.exerciseId },
    select: {
      id: true,
      kind: true,
      points: true,
      room: {
        select: {
          id: true,
          path: { select: { published: true, deletedAt: true } },
        },
      },
      quizQuestions: {
        orderBy: { position: "asc" },
        select: { answer: true, explanation: true },
      },
    },
  });
  if (
    !exercise ||
    exercise.kind !== ExerciseKind.QUIZ ||
    !exercise.room ||
    !exercise.room.path.published ||
    exercise.room.path.deletedAt != null
  )
    throw NOT_FOUND();
  if (!(await canAccessRoom(user.id, exercise.room.id)))
    throw new AppError(403, "ROOM_LOCKED", "Bài học đang khóa.");
  if (parsed.data.answers.length !== exercise.quizQuestions.length)
    throw new AppError(
      400,
      "INVALID_SUBMISSION",
      "Bài làm không khớp số câu hỏi. Vui lòng tải lại trang.",
    );

  const grade = gradeQuiz(
    exercise.quizQuestions,
    parsed.data.answers,
    exercise.points,
  );
  const submission = await db.submission.create({
    data: {
      userId: user.id,
      exerciseId: exercise.id,
      status: grade.passed
        ? SubmissionStatus.ACCEPTED
        : SubmissionStatus.REJECTED,
      score: grade.score,
      quizAnswers: parsed.data.answers,
      feedback: `Đúng ${grade.correct}/${grade.total} câu.`,
    },
    select: { id: true },
  });

  let roomCompleted = false;
  if (grade.passed) {
    try {
      roomCompleted = !!(await completeRoomIfDone(user.id, exercise.room.id));
      if (!roomCompleted) await recordStreakActivity({ userId: user.id });
    } catch (error) {
      logger.error("quiz.room_completion_failed", {
        submissionId: submission.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { ...grade, roomId: exercise.room.id, roomCompleted };
}

export type QuizResult = Awaited<ReturnType<typeof submitQuiz>>;

/** Lượt làm gần nhất của học viên, kèm kết quả từng câu để xem lại. */
export async function getLastQuizAttempt(userId: string, exerciseId: string) {
  const [last, questions, exercise] = await Promise.all([
    db.submission.findFirst({
      where: { userId, exerciseId, contestId: null },
      orderBy: { createdAt: "desc" },
      select: { quizAnswers: true, createdAt: true },
    }),
    db.quizQuestion.findMany({
      where: { exerciseId },
      orderBy: { position: "asc" },
      select: { answer: true, explanation: true },
    }),
    db.exercise.findUnique({
      where: { id: exerciseId },
      select: { points: true },
    }),
  ]);
  if (!last || last.quizAnswers.length !== questions.length) return null;
  return {
    ...gradeQuiz(questions, last.quizAnswers, exercise?.points ?? 0),
    submittedAt: last.createdAt,
  };
}
