"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { AppError } from "@/lib/errors";
import { setPathSequentialUnlock } from "./management";

const schema = z.object({
  pathId: z.string().min(1).max(200),
  enabled: z.boolean(),
});

export async function changePathUnlock(input: {
  pathId: string;
  enabled: boolean;
}) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Cấu hình không hợp lệ." };
  try {
    await setPathSequentialUnlock(parsed.data.pathId, parsed.data.enabled);
    revalidatePath("/creator/paths");
    revalidatePath("/paths", "layout");
    revalidatePath("/rooms", "layout");
    return { error: null };
  } catch (error) {
    return {
      error:
        error instanceof AppError
          ? error.message
          : "Chưa thể lưu cấu hình. Vui lòng thử lại.",
    };
  }
}
