import type { Difficulty, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type CatalogFilters = {
  q?: string;
  difficulty?: Difficulty;
  tag?: string;
  sort: "newest" | "popular";
};

/** `userId` null là khách chưa đăng nhập: không lấy đăng ký hay tiến độ của ai cả. */
function learnerSelection(userId: string | null) {
  const own = userId ? { where: { userId } } : { take: 0 };
  return {
    id: true,
    slug: true,
    title: true,
    description: true,
    sequentialUnlock: true,
    difficulty: true,
    tags: true,
    estimatedMinutes: true,
    coverTheme: true,
    publishedAt: true,
    // Only the display name and the approved teaching school are public; never the email.
    creator: {
      select: {
        name: true,
        teacherApplications: {
          where: { status: "APPROVED" as const },
          orderBy: { reviewedAt: "desc" as const },
          take: 1,
          select: { schoolName: true, province: true },
        },
      },
    },
    _count: { select: { enrollments: true } },
    enrollments: { ...own, select: { userId: true }, take: userId ? 1 : 0 },
    rooms: {
      orderBy: { position: "asc" as const },
      select: {
        id: true,
        title: true,
        description: true,
        position: true,
        progress: { ...own, select: { roomId: true } },
        _count: { select: { exercises: true } },
      },
    },
  } as const;
}

function buildCatalogWhere(filters?: CatalogFilters): Prisma.PathWhereInput {
  const where: Prisma.PathWhereInput = { published: true, deletedAt: null };
  if (filters?.difficulty) where.difficulty = filters.difficulty;
  if (filters?.tag) where.tags = { has: filters.tag };
  if (filters?.q) {
    const contains = { contains: filters.q, mode: "insensitive" as const };
    where.OR = [
      { title: contains },
      { description: contains },
      { tags: { has: filters.q } },
      { creator: { name: contains } },
    ];
  }
  return where;
}

function buildCatalogOrderBy(sort?: CatalogFilters["sort"]) {
  const newest = [
    { publishedAt: { sort: "desc" as const, nulls: "last" as const } },
    { createdAt: "desc" as const },
    { id: "asc" as const },
  ];
  return sort === "popular"
    ? [{ enrollments: { _count: "desc" as const } }, ...newest]
    : newest;
}

export function listPaths(userId: string, filters?: CatalogFilters) {
  return db.path.findMany({
    where: buildCatalogWhere(filters),
    select: learnerSelection(userId),
    orderBy: buildCatalogOrderBy(filters?.sort),
  });
}

export function countPublishedPaths(filters?: CatalogFilters) {
  return db.path.count({
    where: buildCatalogWhere(filters),
  });
}

export function listPublishedPathsPage(
  userId: string | null,
  filters: CatalogFilters | undefined,
  skip: number,
  take: number,
) {
  return db.path.findMany({
    where: buildCatalogWhere(filters),
    select: learnerSelection(userId),
    orderBy: buildCatalogOrderBy(filters?.sort),
    skip,
    take,
  });
}

/** Chủ đề đang được dùng nhiều nhất trên các lộ trình đã xuất bản, để làm nút lọc nhanh. */
export async function listPopularTags(limit = 12) {
  const rows = await db.path.findMany({
    where: { published: true, deletedAt: null },
    select: { tags: true },
  });
  const counts = new Map<string, number>();
  for (const { tags } of rows)
    for (const tag of tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([tag]) => tag);
}

export function findPublishedPath(slug: string, userId: string | null) {
  return db.path.findFirst({
    where: { slug, published: true, deletedAt: null },
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
