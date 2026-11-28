"use server";

import { revalidatePath } from "next/cache";
import { AppError } from "@/lib/errors";
import { addLessonVideo, saveManagedLesson } from "./authoring";

function revalidateLesson(room: { id: string; slug: string }) {
  revalidatePath("/gv/paths");
  revalidatePath(`/gv/paths/${room.slug}`);
  revalidatePath(`/gv/paths/${room.slug}/rooms/${room.id}`);
  revalidatePath(`/hv/paths/${room.slug}`);
  revalidatePath(`/hv/rooms/${room.id}`);
}

export async function saveLessonAction(input: unknown) {
  try {
    const room = await saveManagedLesson(input);
    revalidateLesson(room);
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

export async function addLessonVideoAction(input: unknown) {
  try {
    const room = await addLessonVideo(input);
    revalidateLesson(room);
    return { data: room, error: null };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof AppError
          ? error.message
          : "Chưa thể thêm video. Vui lòng thử lại.",
    };
  }
}
