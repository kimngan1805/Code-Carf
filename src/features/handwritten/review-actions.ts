"use server";

import { revalidatePath } from "next/cache";
import { AppError } from "@/lib/errors";
import { gradeHandwrittenSubmission } from "./review";

export async function gradeHandwrittenAction(input: unknown) {
  try {
    const result = await gradeHandwrittenSubmission(input);
    revalidatePath("/gv/grading");
    revalidatePath(`/gv/grading/${result.id}`);
    revalidatePath("/hv/exercises", "layout");
    revalidatePath("/hv/submissions");
    return { error: null };
  } catch (error) {
    return {
      error:
        error instanceof AppError
          ? error.message
          : "Chưa thể lưu điểm. Vui lòng thử lại.",
    };
  }
}
