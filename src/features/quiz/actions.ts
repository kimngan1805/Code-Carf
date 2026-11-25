"use server";

import { revalidatePath } from "next/cache";
import { AppError } from "@/lib/errors";
import { submitQuiz } from "./service";

export async function submitQuizAction(input: unknown) {
  try {
    const result = await submitQuiz(input);
    revalidatePath(`/hv/rooms/${result.roomId}`);
    revalidatePath("/hv/paths", "layout");
    return { data: result, error: null };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof AppError
          ? error.message
          : "Chưa thể nộp bài. Vui lòng thử lại.",
    };
  }
}
