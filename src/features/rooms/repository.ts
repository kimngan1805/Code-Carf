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
        orderBy: { id: "asc" },
        select: {
          id: true,
          title: true,
          prompt: true,
          kind: true,
          points: true,
        },
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
