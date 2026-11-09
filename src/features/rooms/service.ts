import { RoleName } from "@prisma/client";
import { requireRole } from "@/features/auth/service";
import { listRooms } from "./repository";
export async function getRooms() {
  await requireRole([RoleName.STUDENT, RoleName.TEACHER, RoleName.ADMIN]);
  return listRooms();
}
