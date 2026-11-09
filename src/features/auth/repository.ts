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
