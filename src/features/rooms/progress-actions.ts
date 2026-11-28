"use server";

import { revalidatePath } from "next/cache";
import { AppError } from "@/lib/errors";
import { markRoomLearned } from "./service";

export async function markRoomLearnedAction(roomId: string) {
  try {
    const result = await markRoomLearned(roomId);
    revalidatePath(`/hv/rooms/${roomId}`);
    revalidatePath("/hv/paths", "layout");
    revalidatePath("/hv/dashboard");
    return {
      error: null,
      next: result.completion?.nextRoom ?? null,
      xp: result.completion?.xpAwarded ?? 0,
    };
  } catch (error) {
    return {
      error:
        error instanceof AppError
          ? error.message
          : "Chưa thể đánh dấu hoàn thành. Vui lòng thử lại.",
      next: null,
      xp: 0,
    };
  }
}
