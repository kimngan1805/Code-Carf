import { db } from "@/lib/db";
export function listPaths() {
  return db.path.findMany({
    select: { id: true, slug: true, title: true, description: true },
    orderBy: { createdAt: "desc" },
  });
}
