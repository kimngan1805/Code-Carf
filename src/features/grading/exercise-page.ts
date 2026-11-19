import { ExerciseKind, RoleName } from "@prisma/client";
import { requireRole } from "@/features/auth/service";
import { canAccessRoom } from "@/features/rooms/access";
import { getOwnHandwrittenUpload } from "@/features/handwritten/service";
import { AppError } from "@/lib/errors";
import { findExerciseForPractice } from "./repository";

/**
 * Data for the practice page `/hv/exercises/[id]`, for code and handwritten
 * exercises (`kind` tells the page which one to render).
 *
 * Returns `accessible: false` (not an error) when the learner has not unlocked
 * the room, so the page can send them to the room's own locked view. Hidden
 * test cases are never selected, and prompt/limits are only read after the
 * room-access contract (#62) passes.
 */
export async function getExercisePage(exerciseId: string) {
  const user = await requireRole([RoleName.STUDENT]);
  const exercise = await findExerciseForPractice(exerciseId);
  if (!exercise || !exercise.room || !exercise.room.path.published)
    throw new AppError(404, "EXERCISE_NOT_FOUND", "Không tìm thấy bài tập.");
  if (!(await canAccessRoom(user.id, exercise.room.id)))
    return { accessible: false as const, roomId: exercise.room.id };
  const path = {
    slug: exercise.room.path.slug,
    title: exercise.room.path.title,
  };
  const room = { id: exercise.room.id, title: exercise.room.title };
  if (exercise.kind === ExerciseKind.HANDWRITTEN)
    return {
      accessible: true as const,
      kind: "HANDWRITTEN" as const,
      userId: user.id,
      id: exercise.id,
      title: exercise.title,
      prompt: exercise.prompt,
      points: exercise.points,
      room,
      path,
      upload: await getOwnHandwrittenUpload(user.id, exercise.id),
    };
  return {
    accessible: true as const,
    kind: "CODE" as const,
    userId: user.id,
    id: exercise.id,
    title: exercise.title,
    prompt: exercise.prompt,
    points: exercise.points,
    timeLimitMs: exercise.timeLimitMs,
    memoryLimitKb: exercise.memoryLimitKb,
    room,
    path,
    sampleTests: exercise.testCases.map(({ id, input, expected }) => ({
      id,
      input,
      expected,
    })),
  };
}

type AccessiblePage = Extract<
  Awaited<ReturnType<typeof getExercisePage>>,
  { accessible: true }
>;
export type ExercisePage = Extract<AccessiblePage, { kind: "CODE" }>;
export type HandwrittenExercisePage = Extract<
  AccessiblePage,
  { kind: "HANDWRITTEN" }
>;
