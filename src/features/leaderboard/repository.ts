import { db } from "@/lib/db";
export function listTopUsers() {
  return db.user.findMany({
    select: { id: true, name: true, xp: true },
    orderBy: [{ xp: "desc" }, { id: "asc" }],
    take: 20,
  });
}
