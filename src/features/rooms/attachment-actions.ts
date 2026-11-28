"use server";

import { revalidatePath } from "next/cache";
import { AppError } from "@/lib/errors";
import {
  deleteRoomAttachment,
  reorderRoomAttachments,
  type RoomAttachmentItem,
} from "./attachments";

type Result =
  { data: RoomAttachmentItem[]; error: null } | { data: null; error: string };

async function run(
  roomId: string,
  action: () => Promise<{ attachments: RoomAttachmentItem[]; slug: string }>,
): Promise<Result> {
  try {
    const { attachments, slug } = await action();
    revalidatePath(`/gv/paths/${slug}/rooms/${roomId}`);
    revalidatePath(`/hv/rooms/${roomId}`);
    return { data: attachments, error: null };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof AppError
          ? error.message
          : "Chưa thể cập nhật tài liệu. Vui lòng thử lại.",
    };
  }
}

export async function reorderAttachmentsAction(
  roomId: string,
  attachmentIds: string[],
) {
  return run(roomId, () => reorderRoomAttachments({ roomId, attachmentIds }));
}

export async function deleteAttachmentAction(
  roomId: string,
  attachmentId: string,
) {
  return run(roomId, () => deleteRoomAttachment({ roomId, attachmentId }));
}
