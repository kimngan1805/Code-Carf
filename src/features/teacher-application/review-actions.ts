"use server";

import { revalidatePath } from "next/cache";
import { AppError } from "@/lib/errors";
import { reviewTeacherApplication } from "./service";

export async function reviewApplication(input: {
  id: string;
  decision: "approve" | "reject";
  note: string;
}) {
  try {
    await reviewTeacherApplication(input.id, {
      decision: input.decision,
      note: input.note,
    });
    revalidatePath("/admin/teacher-applications");
    revalidatePath(`/admin/teacher-applications/${input.id}`);
    return { error: null };
  } catch (error) {
    return {
      error:
        error instanceof AppError
          ? error.message
          : "Chưa thể lưu kết quả. Vui lòng thử lại.",
    };
  }
}
