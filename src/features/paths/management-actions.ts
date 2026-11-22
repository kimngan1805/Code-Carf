"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { AppError } from "@/lib/errors";
import { deleteManagedPath, setPathSequentialUnlock } from "./management";

const schema = z.object({
  pathId: z.string().min(1).max(200),
  enabled: z.boolean(),
});

const deleteSchema = z
  .object({
    pathId: z.string().trim().min(1).max(200),
  })
  .strict();

export async function changePathUnlock(input: {
  pathId: string;
  enabled: boolean;
}) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Cấu hình không hợp lệ." };
  try {
    await setPathSequentialUnlock(parsed.data.pathId, parsed.data.enabled);
    revalidatePath("/gv/paths");
    revalidatePath("/gv/paths", "layout");
    revalidatePath("/hv/paths", "layout");
    revalidatePath("/hv/rooms", "layout");
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

export async function deletePathAction(input: unknown) {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { error: "Yêu cầu xóa lộ trình không hợp lệ." };
  try {
    const { slug } = await deleteManagedPath(parsed.data.pathId);
    revalidatePath("/gv/paths");
    revalidatePath(`/gv/paths/${slug}`);
    revalidatePath("/hv/paths", "layout");
    revalidatePath("/hv/rooms", "layout");
    revalidatePath("/hv/dashboard");
    revalidatePath("/hv/search");
    revalidatePath("/leaderboard");
    return { error: null };
  } catch (error) {
    return {
      error:
        error instanceof AppError
          ? error.message
          : "Chưa thể xóa lộ trình. Vui lòng thử lại.",
    };
  }
}
