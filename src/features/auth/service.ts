import { RoleName } from "@prisma/client";
import { auth } from "@/auth";
import { AppError } from "@/lib/errors";
import { findUserWithRole } from "./repository";

export async function requireRole(roles: RoleName[]) {
  const session = await auth();
  if (!session?.user?.id)
    throw new AppError(401, "UNAUTHORIZED", "Sign in required");
  const user = await findUserWithRole(session.user.id);
  if (!user || !roles.includes(user.role.name))
    throw new AppError(403, "FORBIDDEN", "Insufficient permission");
  return user;
}
