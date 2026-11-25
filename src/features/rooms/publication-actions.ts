"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { setRoomPublication } from "./publication";

const schema = z
  .object({
    roomId: z.string().min(1).max(200),
    published: z.boolean(),
  })
  .strict();

export async function changeRoomPublication(input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { error: "Trạng thái bài học không hợp lệ." };
  }

  try {
    const result = await setRoomPublication(
      parsed.data.roomId,
      parsed.data.published,
    );
    revalidatePath("/gv/paths");
    revalidatePath(`/gv/paths/${result.pathSlug}`);
    revalidatePath(`/gv/paths/${result.pathSlug}/rooms/${result.id}`);
    revalidatePath(`/gv/paths/${result.pathSlug}/rooms/${result.id}/preview`);
    revalidatePath("/hv/paths", "layout");
    revalidatePath(`/hv/paths/${result.pathSlug}`);
    revalidatePath("/hv/rooms", "layout");
    revalidatePath(`/hv/rooms/${result.id}`);
    revalidatePath("/hv/dashboard");
    revalidatePath("/hv/profile");
    return { error: null, published: result.published };
  } catch (error) {
    return {
      error:
        error instanceof AppError
          ? error.message
          : "Chưa thể đổi trạng thái bài học. Vui lòng thử lại.",
    };
  }
}
