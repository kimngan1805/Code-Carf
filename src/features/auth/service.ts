import { Prisma, RoleName } from "@prisma/client";
import { hash } from "bcryptjs";
import { auth } from "@/auth";
import { AppError } from "@/lib/errors";
import { createUser, findUserWithRole } from "./repository";
import type { RegisterInput } from "./schemas";

export async function requireRole(roles: RoleName[]) {
  const session = await auth();
  if (!session?.user?.id)
    throw new AppError(401, "UNAUTHORIZED", "Sign in required");
  const user = await findUserWithRole(session.user.id);
  if (!user || !roles.includes(user.role.name))
    throw new AppError(403, "FORBIDDEN", "Insufficient permission");
  return user;
}

/** Signed-in user from the database, or null when there is no session or the account no longer exists. */
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return findUserWithRole(session.user.id);
}

/** Self-registration always creates a STUDENT; other roles are assigned by an admin. */
export async function registerUser(input: RegisterInput) {
  const passwordHash = await hash(input.password, 12);
  try {
    return await createUser({
      name: input.name,
      email: input.email,
      passwordHash,
      role: RoleName.STUDENT,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new AppError(409, "EMAIL_TAKEN", "Email đã được sử dụng");
    throw error;
  }
}
