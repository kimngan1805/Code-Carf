"use server";

import { revalidatePath } from "next/cache";
import { AppError } from "@/lib/errors";
import { updateManagedPathDetails } from "./details";

export async function updatePathDetailsAction(input: unknown) {
  try {
    const { slug } = await updateManagedPathDetails(input);
    revalidatePath("/gv/paths");
    revalidatePath(`/gv/paths/${slug}`);
    revalidatePath("/hv/paths", "layout");
    return { data: { slug }, error: null };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof AppError
          ? error.message
          : "Chưa thể lưu thông tin lộ trình. Vui lòng thử lại.",
    };
  }
}
