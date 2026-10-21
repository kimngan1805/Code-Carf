import { RoleName } from "@prisma/client";
import { requireRole } from "@/features/auth/service";
import { AppError } from "@/lib/errors";
import { enrollInPath, findPublishedPath, listPaths } from "./repository";

type PathRecord = Awaited<ReturnType<typeof listPaths>>[number];

function presentPath(path: PathRecord) {
  const completed = path.rooms.filter(
    (room) => room.progress.length > 0,
  ).length;
  const total = path.rooms.length;
  return {
    id: path.id,
    slug: path.slug,
    title: path.title,
    description: path.description,
    enrolled: path.enrollments.length > 0,
    completed,
    total,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
    rooms: path.rooms.map((room) => ({
      id: room.id,
      title: room.title,
      description: room.description,
      position: room.position,
      completed: room.progress.length > 0,
      exercises: room._count.exercises,
    })),
  };
}

export async function getPaths() {
  const user = await requireRole([
    RoleName.STUDENT,
    RoleName.TEACHER,
    RoleName.ADMIN,
  ]);
  return (await listPaths(user.id)).map(presentPath);
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

export async function registerForPath(slug: string) {
  const user = await requireRole([RoleName.STUDENT]);
  const path = await findPublishedPath(slug, user.id);
  if (!path)
    throw new AppError(404, "PATH_NOT_FOUND", "Không tìm thấy lộ trình.");
  return enrollInPath(user.id, path.id);
}
