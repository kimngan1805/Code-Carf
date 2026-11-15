import { RoleName } from "@prisma/client";
import { requireRole } from "@/features/auth/service";
import { AppError } from "@/lib/errors";
import { canAccessRoom } from "./access";
import {
  findPreviousRoom,
  findRoomAccess,
  findRoomContent,
  findRoomExerciseStatuses,
  listRooms,
} from "./repository";
import { exerciseState } from "./exercise-status";

async function loadRoom(roomId: string, userId: string) {
  const [content, statuses] = await Promise.all([
    findRoomContent(roomId),
    findRoomExerciseStatuses(roomId, userId),
  ]);
  if (!content)
    throw new AppError(404, "ROOM_NOT_FOUND", "Không tìm thấy bài học.");
  const exercises = content.exercises.map((exercise) => ({
    ...exercise,
    state: exerciseState(
      statuses
        .filter((row) => row.exerciseId === exercise.id)
        .map((row) => row.status),
    ),
  }));
  return {
    ...content,
    exercises,
    passedExercises: exercises.filter((exercise) => exercise.state === "passed")
      .length,
  };
}

/** The locked view exposes only catalog metadata, never theory, prompts or submissions. */
export async function getRoomPage(roomId: string) {
  const user = await requireRole([RoleName.STUDENT]);
  const room = await findRoomAccess(roomId, user.id);
  if (!room || !room.path.published)
    throw new AppError(404, "ROOM_NOT_FOUND", "Không tìm thấy bài học.");
  if (!(await canAccessRoom(user.id, roomId))) {
    const enrolled = room.path.enrollments.length > 0;
    const previous = enrolled
      ? await findPreviousRoom(room.pathId, room.position, user.id)
      : null;
    return {
      accessible: false as const,
      id: room.id,
      title: room.title,
      path: { title: room.path.title, slug: room.path.slug },
      reason: enrolled ? ("previous_room" as const) : ("enrollment" as const),
      message: enrolled
        ? `Hoàn thành ${previous ? `“${previous.title}”` : "bài học trước"} để mở khóa bài học này.`
        : "Bạn cần đăng ký lộ trình trước khi mở bài học này.",
    };
  }
  return { accessible: true as const, ...(await loadRoom(roomId, user.id)) };
}

export async function getRoom(roomId: string) {
  const user = await requireRole([RoleName.STUDENT]);
  const room = await findRoomAccess(roomId, user.id);
  if (!room || !room.path.published)
    throw new AppError(404, "ROOM_NOT_FOUND", "Không tìm thấy bài học.");
  if (!(await canAccessRoom(user.id, roomId)))
    throw new AppError(
      403,
      "ROOM_LOCKED",
      "Đăng ký lộ trình và hoàn thành bài học trước để mở bài học này.",
    );
  return loadRoom(roomId, user.id);
}
export async function getRooms() {
  await requireRole([RoleName.STUDENT, RoleName.TEACHER, RoleName.ADMIN]);
  return listRooms();
}
