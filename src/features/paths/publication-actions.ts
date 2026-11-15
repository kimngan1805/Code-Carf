"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { AppError } from "@/lib/errors";
import { setPathPublication } from "./publication";

const schema = z
  .object({ pathId: z.string().min(1).max(200), published: z.boolean() })
  .strict();
export async function changePathPublication(input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Trạng thái lộ trình không hợp lệ." };
  try {
    const slug = await setPathPublication(
      parsed.data.pathId,
      parsed.data.published,
    );
    revalidatePath("/gv/paths");
    revalidatePath(`/gv/paths/${slug}`);
    revalidatePath("/hv/paths", "layout");
    revalidatePath("/hv/rooms", "layout");
    revalidatePath("/hv/dashboard");
    return { error: null };
  } catch (error) {
    return {
      error:
        error instanceof AppError
          ? error.message
          : "Chưa thể đổi trạng thái. Vui lòng thử lại.",
    };
  }
}
