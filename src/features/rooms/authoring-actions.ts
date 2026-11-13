"use server";

import { revalidatePath } from "next/cache";
import { AppError } from "@/lib/errors";
import { saveManagedLesson } from "./authoring";

export async function saveLessonAction(input: unknown) {
  try {
    const room = await saveManagedLesson(input);
    revalidatePath("/gv/paths");
    revalidatePath(`/gv/paths/${room.slug}`);
    revalidatePath(`/gv/paths/${room.slug}/rooms/${room.id}`);
    revalidatePath(`/hv/paths/${room.slug}`);
    revalidatePath(`/hv/rooms/${room.id}`);
    return { data: room, error: null };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof AppError
          ? error.message
          : "Chưa thể lưu bài học. Vui lòng thử lại.",
    };
  }
}
