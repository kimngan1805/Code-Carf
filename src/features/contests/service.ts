import { RoleName } from "@prisma/client";
import { requireRole } from "@/features/auth/service";
import { listContests } from "./repository";
export async function getContests() {
  await requireRole(Object.values(RoleName));
  return listContests();
}
