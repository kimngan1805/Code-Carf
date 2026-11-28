import { db } from "@/lib/db";

export function findRoomAccess(roomId: string, userId: string) {
  return db.room.findUnique({
    where: { id: roomId },
    select: {
      id: true,
      title: true,
      published: true,
      pathId: true,
      position: true,
      path: {
        select: {
          slug: true,
          title: true,
          published: true,
          deletedAt: true,
          sequentialUnlock: true,
          enrollments: { where: { userId }, select: { userId: true }, take: 1 },
        },
      },
    },
  });
}

export function findPreviousRoom(
  pathId: string,
  position: number,
  userId: string,
) {
  return db.room.findFirst({
    where: { pathId, published: true, position: { lt: position } },
    orderBy: { position: "desc" },
    select: {
      id: true,
      title: true,
      progress: { where: { userId }, select: { roomId: true } },
    },
  });
}

/** Bài học kế tiếp (đã xuất bản) trong cùng lộ trình, để mời học viên học tiếp. */
export function findNextRoom(pathId: string, position: number) {
  return db.room.findFirst({
    where: { pathId, published: true, position: { gt: position } },
    orderBy: { position: "asc" },
    select: { id: true, title: true },
  });
}

export function findRoomContent(roomId: string) {
  return db.room.findFirst({
    where: {
      id: roomId,
      published: true,
      path: { published: true, deletedAt: null },
    },
    select: {
      id: true,
      title: true,
      description: true,
      content: true,
      exercises: {
        orderBy: [{ position: "asc" }, { id: "asc" }],
        select: {
          id: true,
          title: true,
          prompt: true,
          kind: true,
          points: true,
        },
      },
      attachments: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        select: { id: true, fileName: true, contentType: true, size: true },
      },
      path: { select: { slug: true, title: true } },
    },
  });
}

export function findRoomExerciseStatuses(roomId: string, userId: string) {
  return db.submission.groupBy({
    by: ["exerciseId", "status"],
    where: { userId, contestId: null, exercise: { roomId } },
  });
}

export function listRooms() {
  return db.room.findMany({
    where: { published: true, path: { published: true, deletedAt: null } },
    select: {
      id: true,
      title: true,
      position: true,
      path: { select: { title: true } },
    },
    orderBy: [{ pathId: "asc" }, { position: "asc" }],
  });
}

/** Học viên đã hoàn thành bài học này chưa (có dòng RoomProgress). */
export async function isRoomCompleted(roomId: string, userId: string) {
  const row = await db.roomProgress.findUnique({
    where: { userId_roomId: { userId, roomId } },
    select: { roomId: true },
  });
  return row !== null;
}
