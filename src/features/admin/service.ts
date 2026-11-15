import { RoleName } from "@prisma/client";
import { requireRole } from "@/features/auth/service";
import { countPendingTeacherApplications, countUsers } from "./repository";

export async function getAdminSummary() {
  await requireRole([RoleName.ADMIN]);
  const [users, pendingTeacherApplications] = await Promise.all([
    countUsers(),
    countPendingTeacherApplications(),
  ]);
  return { users, pendingTeacherApplications };
}
