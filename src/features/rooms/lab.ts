import { headers } from "next/headers";
import { RoleName } from "@prisma/client";
import { requireRole } from "@/features/auth/service";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { canAccessRoom } from "./access";

/** Explicit opt-in, loopback web host and loopback DB only. Never mutate real paths. */
export async function requireRoomLab() {
  const host = (await headers()).get("host") ?? "";
  let databaseHost = "";
  try {
    databaseHost = new URL(process.env.DATABASE_URL ?? "").hostname;
  } catch {}
  if (
    process.env.ROOM_UNLOCK_LAB !== "1" ||
    !/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(databaseHost)
  )
    throw new AppError(404, "NOT_FOUND", "Không tìm thấy trang.");
  return requireRole([RoleName.STUDENT]);
}

export async function getLabPath(userId: string) {
  return db.path.upsert({
    where: { slug: `room-unlock-lab-${userId}` },
    update: {},
    create: {
      slug: `room-unlock-lab-${userId}`,
      title: "Thử nghiệm mở khóa Room",
      description: "Dữ liệu riêng để thử #12, không thay đổi tiến độ học thật.",
      creatorId: userId,
      published: true,
      sequentialUnlock: true,
      enrollments: { create: { userId } },
      rooms: {
        create: [1, 2, 3].map((position) => ({
          title: `Room ${position} — Thử nghiệm`,
          position,
          content: `Đã mở được Room ${position}. Đây là nội dung thử nghiệm của #12.`,
        })),
      },
    },
    include: {
      rooms: {
        orderBy: { position: "asc" },
        include: { progress: { where: { userId } } },
      },
    },
  });
}

export async function presentLab(userId: string) {
  const path = await getLabPath(userId);
  return {
    slug: path.slug,
    sequentialUnlock: path.sequentialUnlock,
    rooms: await Promise.all(
      path.rooms.map(async (room) => ({
        id: room.id,
        title: room.title,
        completed: room.progress.length > 0,
        accessible: await canAccessRoom(userId, room.id),
      })),
    ),
  };
}
