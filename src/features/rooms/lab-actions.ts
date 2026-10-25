"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { canAccessRoom } from "./access";
import { getLabPath, presentLab, requireRoomLab } from "./lab";

const inputSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("reset") }),
  z.object({ action: z.literal("toggle"), enabled: z.boolean() }),
  z.object({ action: z.literal("complete"), roomId: z.string().min(1) }),
  z.object({ action: z.literal("undo"), roomId: z.string().min(1) }),
]);

export async function changeRoomLab(input: z.infer<typeof inputSchema>) {
  try {
    const user = await requireRoomLab();
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success)
      throw new AppError(400, "INVALID_INPUT", "Thao tác không hợp lệ.");
    const command = parsed.data;
    const path = await getLabPath(user.id);
    if (command.action === "toggle") {
      await db.path.update({
        where: { id: path.id },
        data: { sequentialUnlock: command.enabled },
      });
    } else if (command.action === "reset") {
      await db.$transaction([
        db.roomProgress.deleteMany({
          where: {
            userId: user.id,
            roomId: { in: path.rooms.map((room) => room.id) },
          },
        }),
        db.path.update({
          where: { id: path.id },
          data: { sequentialUnlock: true },
        }),
      ]);
    } else {
      if (!path.rooms.some((room) => room.id === command.roomId))
        throw new AppError(
          400,
          "INVALID_ROOM",
          "Chỉ thay đổi Room trong bộ thử nghiệm này.",
        );
      if (command.action === "complete") {
        if (!(await canAccessRoom(user.id, command.roomId)))
          throw new AppError(
            403,
            "ROOM_LOCKED",
            "Hãy mở khóa Room trước khi hoàn thành.",
          );
        await db.roomProgress.upsert({
          where: { userId_roomId: { userId: user.id, roomId: command.roomId } },
          update: {},
          create: { userId: user.id, roomId: command.roomId },
        });
      } else {
        await db.roomProgress.deleteMany({
          where: { userId: user.id, roomId: command.roomId },
        });
      }
    }
    revalidatePath("/paths");
    revalidatePath(`/paths/${path.slug}`);
    return { data: await presentLab(user.id), error: null };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof AppError
          ? error.message
          : "Không thể cập nhật. Vui lòng thử lại.",
    };
  }
}
