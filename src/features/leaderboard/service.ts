import { RoleName } from "@prisma/client";
import { requireRole } from "@/features/auth/service";
import { listTopUsers } from "./repository";
export async function getLeaderboard() {
  await requireRole(Object.values(RoleName));
  return listTopUsers();
}
