import { RoleName } from "@prisma/client";
import { requireRole } from "@/features/auth/service";
import { countUsers } from "./repository";
export async function getAdminSummary() {
  await requireRole([RoleName.ADMIN]);
  return { users: await countUsers() };
}
