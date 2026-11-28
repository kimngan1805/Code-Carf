"use server";

import { revalidatePath } from "next/cache";
import { AppError } from "@/lib/errors";
import { addLessonVideoToLibrary } from "@/features/library/service";
import { addLessonVideo, saveManagedLesson } from "./authoring";
import { deleteManagedLesson, moveManagedLesson } from "./lesson-order";

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
    // Video thêm vào bài học cũng có trong kho tài liệu của giảng viên.
    await addLessonVideoToLibrary(input);
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

export async function moveLessonAction(input: unknown) {
  try {
    const result = await moveManagedLesson(input);
    revalidatePath(`/gv/paths/${result.slug}`);
    revalidatePath(`/hv/paths/${result.slug}`);
    return { error: null };
  } catch (error) {
    return {
      error:
        error instanceof AppError
          ? error.message
          : "Chưa thể đổi thứ tự bài học. Vui lòng thử lại.",
    };
  }
}

export async function deleteLessonAction(input: unknown) {
  try {
    const result = await deleteManagedLesson(input);
    revalidatePath("/gv/paths");
    revalidatePath(`/gv/paths/${result.slug}`);
    revalidatePath(`/hv/paths/${result.slug}`);
    return { error: null, slug: result.slug };
  } catch (error) {
    return {
      error:
        error instanceof AppError
          ? error.message
          : "Chưa thể xóa bài học. Vui lòng thử lại.",
      slug: null,
    };
  }
}
