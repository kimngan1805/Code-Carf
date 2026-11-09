import { db } from "@/lib/db";
export function listContests() {
  return db.contest.findMany({
    select: { id: true, title: true, status: true },
    orderBy: { createdAt: "desc" },
  });
}
