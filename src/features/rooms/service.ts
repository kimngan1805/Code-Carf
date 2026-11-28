import { RoleName } from "@prisma/client";
import { requireRole } from "@/features/auth/service";
import { AppError } from "@/lib/errors";
import { canAccessRoom } from "./access";
import {
  findPreviousRoom,
  findRoomAccess,
  findRoomContent,
  findRoomExerciseStatuses,
  findNextRoom,
  isRoomCompleted,
  listRooms,
} from "./repository";
import { exerciseState } from "./exercise-status";
import { completeRoomIfDone } from "@/features/grading/room-completion";

async function loadRoom(roomId: string, userId: string) {
  const [content, statuses, completed] = await Promise.all([
    findRoomContent(roomId),
    findRoomExerciseStatuses(roomId, userId),
    isRoomCompleted(roomId, userId),
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
    completed,
    // Bài tự luận nộp ảnh là đã làm xong phần của học viên (điểm chấm sau).
    passedExercises: exercises.filter(
      (exercise) =>
        exercise.state === "passed" ||
        (exercise.kind === "HANDWRITTEN" && exercise.state === "submitted"),
    ).length,
  };
}

/** The locked view exposes only catalog metadata, never theory, prompts or submissions. */
export async function getRoomPage(roomId: string) {
  const user = await requireRole([RoleName.STUDENT]);
  const room = await findRoomAccess(roomId, user.id);
  if (
    !room ||
    !room.published ||
    !room.path.published ||
    room.path.deletedAt != null
  )
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
  const loaded = await loadRoom(roomId, user.id);
  // Học xong bài này thì chỉ đường sang bài kế tiếp (kể cả khi tải lại trang).
  const nextRoom = loaded.completed
    ? await findNextRoom(room.pathId, room.position)
    : null;
  return { accessible: true as const, ...loaded, nextRoom };
}

export async function getRoom(roomId: string) {
  const user = await requireRole([RoleName.STUDENT]);
  const room = await findRoomAccess(roomId, user.id);
  if (
    !room ||
    !room.published ||
    !room.path.published ||
    room.path.deletedAt != null
  )
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

/**
 * Bài học không có bài tập: học viên bấm "Đã học xong" để hoàn thành và mở bài
 * tiếp theo. Bài có bài tập thì phải làm bài tập, không đánh dấu tay được.
 */
export async function markRoomLearned(roomId: string) {
  const user = await requireRole([RoleName.STUDENT]);
  if (!(await canAccessRoom(user.id, roomId)))
    throw new AppError(403, "ROOM_LOCKED", "Bài học đang khóa.");
  const content = await findRoomContent(roomId);
  if (!content)
    throw new AppError(404, "ROOM_NOT_FOUND", "Không tìm thấy bài học.");
  if (content.exercises.length > 0)
    throw new AppError(
      400,
      "ROOM_HAS_EXERCISES",
      "Bài học có bài tập, hãy hoàn thành bài tập để qua bài.",
    );
  const completion = await completeRoomIfDone(user.id, roomId, {
    markRead: true,
  });
  return { roomId, completion };
}
