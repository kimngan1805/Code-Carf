"use server";

import { revalidatePath } from "next/cache";
import { AppError } from "@/lib/errors";
import {
  deleteManagedExercise,
  moveManagedExercise,
  saveManagedExercise,
} from "./authoring";

function revalidateRoom(slug: string, roomId: string) {
  revalidatePath(`/gv/paths/${slug}`);
  revalidatePath(`/gv/paths/${slug}/rooms/${roomId}`);
  revalidatePath(`/hv/rooms/${roomId}`);
}

export async function saveExerciseAction(input: unknown) {
  try {
    const exercise = await saveManagedExercise(input);
    revalidateRoom(exercise.slug, exercise.roomId);
    return { data: exercise, error: null };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof AppError
          ? error.message
          : "Chưa thể lưu bài tập. Vui lòng thử lại.",
    };
  }
}

export async function deleteExerciseAction(input: unknown) {
  try {
    const result = await deleteManagedExercise(input);
    revalidateRoom(result.slug, result.roomId);
    return { data: result, error: null };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof AppError
          ? error.message
          : "Chưa thể xóa bài tập. Vui lòng thử lại.",
    };
  }
}

export async function moveExerciseAction(input: unknown) {
  try {
    const result = await moveManagedExercise(input);
    revalidateRoom(result.slug, result.roomId);
    return { error: null };
  } catch (error) {
    return {
      error:
        error instanceof AppError
          ? error.message
          : "Chưa thể đổi thứ tự. Vui lòng thử lại.",
    };
  }
}
