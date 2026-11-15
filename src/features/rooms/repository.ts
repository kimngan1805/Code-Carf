import { db } from "@/lib/db";

export function findRoomAccess(roomId: string, userId: string) {
  return db.room.findUnique({
    where: { id: roomId },
    select: {
      pathId: true,
      position: true,
      path: {
        select: {
          published: true,
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
    where: { pathId, position: { lt: position } },
    orderBy: { position: "desc" },
    select: { progress: { where: { userId }, select: { roomId: true } } },
  });
}

export function findRoomContent(roomId: string) {
  return db.room.findFirst({
    where: { id: roomId, path: { published: true } },
    select: {
      id: true,
      title: true,
      description: true,
      content: true,
      path: { select: { slug: true, title: true } },
    },
  });
}

export function listRooms() {
  return db.room.findMany({
    select: {
      id: true,
      title: true,
      position: true,
      path: { select: { title: true } },
    },
    orderBy: [{ pathId: "asc" }, { position: "asc" }],
  });
}
