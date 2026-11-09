import { RoleName } from "@prisma/client";
import { requireRole } from "@/features/auth/service";
import { listPaths } from "./repository";
export async function getPaths() {
  await requireRole([RoleName.STUDENT, RoleName.TEACHER, RoleName.ADMIN]);
  return listPaths();
}
