import { RoleName } from "@prisma/client";
import { requireRole } from "@/features/auth/service";
import { AppError } from "@/lib/errors";
import { canAccessRoom } from "./access";
import { findRoomAccess, findRoomContent, listRooms } from "./repository";

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
  const content = await findRoomContent(roomId);
  if (!content)
    throw new AppError(404, "ROOM_NOT_FOUND", "Không tìm thấy bài học.");
  return content;
}
export async function getRooms() {
  await requireRole([RoleName.STUDENT, RoleName.TEACHER, RoleName.ADMIN]);
  return listRooms();
}
