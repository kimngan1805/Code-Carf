import { db } from "@/lib/db";
export function countUsers() {
  return db.user.count();
}
