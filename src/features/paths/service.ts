import { RoleName } from "@prisma/client";
import { getCurrentUser, requireRole } from "@/features/auth/service";
import { AppError } from "@/lib/errors";
import {
  CATALOG_PATHS_PAGE_SIZE,
  computePagination,
  normalizePageSize,
} from "./pagination";
import {
  countPublishedPaths,
  enrollInPath,
  findPublishedPath,
  listPaths,
  listPopularTags,
  listPublishedPathsPage,
  type CatalogFilters,
} from "./repository";

type PathRecord = Awaited<ReturnType<typeof listPaths>>[number];

function presentPath(path: PathRecord) {
  const completed = path.rooms.filter(
    (room) => room.progress.length > 0,
  ).length;
  const total = path.rooms.length;
  const school = path.creator.teacherApplications[0];
  return {
    id: path.id,
    slug: path.slug,
    title: path.title,
    description: path.description,
    difficulty: path.difficulty,
    tags: path.tags,
    estimatedMinutes: path.estimatedMinutes,
    coverTheme: path.coverTheme,
    publishedAt: path.publishedAt,
    learners: path._count.enrollments,
    exercises: path.rooms.reduce((sum, room) => sum + room._count.exercises, 0),
    author: {
      name: path.creator.name,
      school: school
        ? { name: school.schoolName, province: school.province }
        : null,
    },
    enrolled: path.enrollments.length > 0,
    completed,
    total,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
    rooms: path.rooms.map((room, index) => ({
      id: room.id,
      title: room.title,
      description: room.description,
      position: room.position,
      completed: room.progress.length > 0,
      accessible:
        path.enrollments.length > 0 &&
        (!path.sequentialUnlock ||
          index === 0 ||
          path.rooms[index - 1].progress.length > 0),
      exercises: room._count.exercises,
    })),
  };
}

export async function getPaths(filters?: CatalogFilters) {
  const user = await requireRole([
    RoleName.STUDENT,
    RoleName.TEACHER,
    RoleName.ADMIN,
  ]);
  return (await listPaths(user.id, filters)).map(presentPath);
}

export async function getCatalogPathsPage(
  filters?: CatalogFilters,
  options?: { page?: unknown; pageSize?: number },
) {
  const user = await requireRole([
    RoleName.STUDENT,
    RoleName.TEACHER,
    RoleName.ADMIN,
  ]);
  return loadCatalogPage(user.id, filters, options);
}

/** Trang khám phá công khai: khách xem được; người đã đăng nhập thấy kèm tiến độ của mình. */
export async function getPublicCatalogPathsPage(
  filters?: CatalogFilters,
  options?: { page?: unknown; pageSize?: number },
) {
  const user = await getCurrentUser();
  return loadCatalogPage(user?.id ?? null, filters, options);
}

async function loadCatalogPage(
  userId: string | null,
  filters?: CatalogFilters,
  options?: { page?: unknown; pageSize?: number },
) {
  const pageSize = normalizePageSize(
    options?.pageSize,
    CATALOG_PATHS_PAGE_SIZE,
  );
  const totalItems = await countPublishedPaths(filters);
  const pagination = computePagination(options?.page, totalItems, pageSize);
  const rows =
    totalItems === 0
      ? []
      : await listPublishedPathsPage(
          userId,
          filters,
          pagination.skip,
          pagination.pageSize,
        );
  return {
    items: rows.map(presentPath),
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalItems: pagination.totalItems,
    totalPages: pagination.totalPages,
  };
}

export async function getCatalogTags() {
  await requireRole([RoleName.STUDENT, RoleName.TEACHER, RoleName.ADMIN]);
  return listPopularTags();
}

/** Chủ đề trên lộ trình đã xuất bản là dữ liệu công khai. */
export function getPublicCatalogTags() {
  return listPopularTags();
}

export async function getPath(slug: string) {
  const user = await requireRole([
    RoleName.STUDENT,
    RoleName.TEACHER,
    RoleName.ADMIN,
  ]);
  const path = await findPublishedPath(slug, user.id);
  if (!path)
    throw new AppError(404, "PATH_NOT_FOUND", "Không tìm thấy lộ trình.");
  return {
    ...presentPath(path),
    canEnroll: user.role.name === RoleName.STUDENT,
  };
}

/** Trang chi tiết công khai: khách xem được; người đã đăng nhập thấy kèm tiến độ của mình. */
export async function getPublicPath(slug: string) {
  const user = await getCurrentUser();
  const path = await findPublishedPath(slug, user?.id ?? null);
  return path ? presentPath(path) : null;
}

export async function registerForPath(slug: string) {
  const user = await requireRole([RoleName.STUDENT]);
  const path = await findPublishedPath(slug, user.id);
  if (!path)
    throw new AppError(404, "PATH_NOT_FOUND", "Không tìm thấy lộ trình.");
  return enrollInPath(user.id, path.id);
}
