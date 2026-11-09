import { db } from "@/lib/db";
export function listRooms() {
  return db.room.findMany({
    select: {
      id: true,
      title: true,
      position: true,
      path: { select: { title: true } },
    },
    orderBy: [{ pathId: "asc" }, { position: "asc" }],
  });
}
