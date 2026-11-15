"use server";

import { revalidatePath } from "next/cache";
import { AppError } from "@/lib/errors";
import { registerForPath } from "./service";

export async function enrollAction(slug: string): Promise<{ error?: string }> {
  if (typeof slug !== "string" || !slug || slug.length > 200)
    return { error: "Lộ trình không hợp lệ." };
  try {
    await registerForPath(slug);
    revalidatePath("/hv/paths");
    revalidatePath(`/hv/paths/${slug}`);
    revalidatePath("/hv/dashboard");
    return {};
  } catch (error) {
    if (error instanceof AppError) return { error: error.message };
    return { error: "Chưa thể đăng ký lộ trình. Vui lòng thử lại." };
  }
}
