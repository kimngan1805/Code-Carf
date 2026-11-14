import { RoleName } from "@prisma/client";
import { requireRole } from "@/features/auth/service";
import { AppError } from "@/lib/errors";
import { findPublishedContest, listContests } from "./repository";
export async function getContests() {
  await requireRole(Object.values(RoleName));
  return listContests();
}

export async function getContest(slug: string) {
  await requireRole(Object.values(RoleName));
  const contest = await findPublishedContest(slug);
  if (!contest)
    throw new AppError(404, "CONTEST_NOT_FOUND", "Không tìm thấy cuộc thi.");
  return contest;
}
