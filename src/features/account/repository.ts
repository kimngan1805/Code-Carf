import { db } from "@/lib/db";

export function updateUserName(userId: string, name: string) {
  return db.user.update({
    where: { id: userId },
    data: { name },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });
}

export function updateUserPasswordHash(userId: string, passwordHash: string) {
  return db.user.update({
    where: { id: userId },
    data: { passwordHash },
    select: {
      id: true,
    },
  });
}
