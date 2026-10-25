import { db } from "@/lib/db";

function learnerSelection(userId: string) {
  return {
    id: true,
    slug: true,
    title: true,
    description: true,
    sequentialUnlock: true,
    enrollments: { where: { userId }, select: { userId: true }, take: 1 },
    rooms: {
      orderBy: { position: "asc" as const },
      select: {
        id: true,
        title: true,
        description: true,
        position: true,
        progress: { where: { userId }, select: { roomId: true } },
        _count: { select: { exercises: true } },
      },
    },
  } as const;
}

export function listPaths(userId: string) {
  return db.path.findMany({
    where: { published: true },
    select: learnerSelection(userId),
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
  });
}

export function findPublishedPath(slug: string, userId: string) {
  return db.path.findFirst({
    where: { slug, published: true },
    select: learnerSelection(userId),
  });
}

export function enrollInPath(userId: string, pathId: string) {
  return db.enrollment.upsert({
    where: { userId_pathId: { userId, pathId } },
    create: { userId, pathId },
    update: {},
    select: { pathId: true, enrolledAt: true },
  });
}
