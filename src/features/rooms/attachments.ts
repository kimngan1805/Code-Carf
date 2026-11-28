import { randomUUID } from "node:crypto";
import { RoleName } from "@prisma/client";
import { z } from "zod";
import { requireRole } from "@/features/auth/service";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getStorage } from "@/lib/storage";
import { addRoomUploadToLibrary } from "@/features/library/service";
import { canAccessRoom } from "./access";
import {
  MAX_ATTACHMENTS_PER_ROOM,
  validateAttachment,
  type UploadedAttachment,
} from "./attachment-rules";

export const attachmentSelect = {
  id: true,
  fileName: true,
  contentType: true,
  size: true,
} as const;
const attachmentOrder = [
  { position: "asc" as const },
  { createdAt: "asc" as const },
];

export type RoomAttachmentItem = {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
};

const ROOM_NOT_FOUND = () =>
  new AppError(
    404,
    "ROOM_NOT_FOUND",
    "Không tìm thấy bài học bạn được quản lý.",
  );
const ATTACHMENT_NOT_FOUND = () =>
  new AppError(404, "ATTACHMENT_NOT_FOUND", "Không tìm thấy tài liệu.");

/** Only the teacher who owns the path, or an admin, may change a lesson's files. */
function managedRoomWhere(
  user: { id: string; role: { name: RoleName } },
  roomId: string,
) {
  return {
    id: roomId,
    path: {
      deletedAt: null,
      ...(user.role.name === RoleName.ADMIN ? {} : { creatorId: user.id }),
    },
  };
}

async function requireManagedRoom(roomId: string) {
  const user = await requireRole([RoleName.TEACHER, RoleName.ADMIN]);
  const room = await db.room.findFirst({
    where: managedRoomWhere(user, roomId),
    select: { id: true, path: { select: { slug: true } } },
  });
  if (!room) throw ROOM_NOT_FOUND();
  return { user, room };
}

export function listRoomAttachments(roomId: string) {
  return db.roomAttachment.findMany({
    where: { roomId },
    orderBy: attachmentOrder,
    select: attachmentSelect,
  });
}

async function removeQuietly(key: string) {
  try {
    await getStorage().delete(key);
  } catch (error) {
    logger.error("room_attachment_delete_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Stores a lecture file in private storage and appends it to the lesson's list. */
export async function uploadRoomAttachment(input: {
  roomId: string;
  file: UploadedAttachment;
}) {
  const { user, room } = await requireManagedRoom(input.roomId);
  const type = validateAttachment(input.file);
  if (
    (await db.roomAttachment.count({ where: { roomId: room.id } })) >=
    MAX_ATTACHMENTS_PER_ROOM
  )
    throw new AppError(
      400,
      "TOO_MANY_ATTACHMENTS",
      `Mỗi bài học có tối đa ${MAX_ATTACHMENTS_PER_ROOM} tài liệu.`,
    );

  // The key is random and unrelated to the file name; files are only served through an authorized route.
  const storageKey = `room-attachments/${randomUUID()}.${type.ext}`;
  await getStorage().put(storageKey, Buffer.from(input.file.bytes));
  try {
    const last = await db.roomAttachment.aggregate({
      where: { roomId: room.id },
      _max: { position: true },
    });
    const attachment = await db.roomAttachment.create({
      data: {
        roomId: room.id,
        fileName: type.fileName,
        contentType: type.mime,
        size: input.file.bytes.length,
        storageKey,
        position: (last._max.position ?? 0) + 1,
      },
      select: attachmentSelect,
    });
    await addRoomUploadToLibrary(user.id, attachment.id);
    return { attachment, slug: room.path.slug };
  } catch (error) {
    await removeQuietly(storageKey);
    throw error;
  }
}

const reorderSchema = z.object({
  roomId: z.string().min(1).max(200),
  attachmentIds: z
    .array(z.string().min(1).max(200))
    .max(MAX_ATTACHMENTS_PER_ROOM),
});

/** Sets the order of all the lesson's files. The list must name each current file exactly once. */
export async function reorderRoomAttachments(input: unknown) {
  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success)
    throw new AppError(400, "INVALID_ORDER", "Thứ tự tài liệu không hợp lệ.");
  const { roomId, attachmentIds } = parsed.data;
  const { room } = await requireManagedRoom(roomId);
  await db.$transaction(async (tx) => {
    const current = await tx.roomAttachment.findMany({
      where: { roomId: room.id },
      select: { id: true },
    });
    const known = new Set(current.map((row) => row.id));
    if (
      attachmentIds.length !== known.size ||
      new Set(attachmentIds).size !== attachmentIds.length ||
      attachmentIds.some((id) => !known.has(id))
    )
      throw new AppError(
        409,
        "ATTACHMENTS_CHANGED",
        "Danh sách tài liệu đã thay đổi. Vui lòng tải lại trang.",
      );
    for (const [index, id] of attachmentIds.entries())
      await tx.roomAttachment.update({
        where: { id },
        data: { position: index + 1 },
      });
  });
  return {
    attachments: await listRoomAttachments(room.id),
    slug: room.path.slug,
  };
}

export async function deleteRoomAttachment(input: {
  roomId: string;
  attachmentId: string;
}) {
  const { room } = await requireManagedRoom(input.roomId);
  const attachment = await db.roomAttachment.findFirst({
    where: { id: input.attachmentId, roomId: room.id },
    select: { id: true, storageKey: true },
  });
  if (!attachment) throw ATTACHMENT_NOT_FOUND();
  await db.roomAttachment.delete({ where: { id: attachment.id } });
  // Only after the row is gone: a failed delete leaves an unreferenced file, never a broken link.
  await removeQuietly(attachment.storageKey);
  return {
    attachments: await listRoomAttachments(room.id),
    slug: room.path.slug,
  };
}

/**
 * The bytes of one lesson file. Teachers and admins who manage the path may
 * always read it (preview, drafts); a learner only once the room is published
 * and unlocked for them. Anything else answers like a missing file.
 */
export async function readRoomAttachment(roomId: string, attachmentId: string) {
  const user = await requireRole([
    RoleName.STUDENT,
    RoleName.TEACHER,
    RoleName.ADMIN,
  ]);
  const attachment = await db.roomAttachment.findFirst({
    where: { id: attachmentId, roomId },
    select: {
      fileName: true,
      contentType: true,
      storageKey: true,
      room: {
        select: {
          published: true,
          path: {
            select: { published: true, deletedAt: true, creatorId: true },
          },
        },
      },
    },
  });
  if (!attachment) throw ATTACHMENT_NOT_FOUND();
  const { room } = attachment;
  const allowed =
    user.role.name === RoleName.STUDENT
      ? room.published &&
        room.path.published &&
        room.path.deletedAt == null &&
        (await canAccessRoom(user.id, roomId))
      : room.path.deletedAt == null &&
        (user.role.name === RoleName.ADMIN || room.path.creatorId === user.id);
  if (!allowed) throw ATTACHMENT_NOT_FOUND();
  const bytes = await getStorage().get(attachment.storageKey);
  return {
    bytes,
    fileName: attachment.fileName,
    contentType: attachment.contentType,
  };
}
