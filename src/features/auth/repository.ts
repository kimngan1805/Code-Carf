import { RoleName } from "@prisma/client";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
export function findUserByEmail(email: string) {
  getEnv();
  return db.user.findUnique({ where: { email }, include: { role: true } });
}
export function findUserWithRole(id: string) {
  getEnv();
  return db.user.findUnique({ where: { id }, include: { role: true } });
}
export function createUser(data: {
  name: string;
  email: string;
  passwordHash: string;
  role: RoleName;
}) {
  getEnv();
  return db.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash: data.passwordHash,
      role: { connect: { name: data.role } },
    },
  });
}
