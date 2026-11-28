import { randomUUID } from "node:crypto";
import type { LectureKind, PrismaClient } from "@prisma/client";
import { getStorage } from "../../lib/storage";

/**
 * Đưa đồ đã có trong các lộ trình của một giảng viên vào kho tài liệu của họ:
 * bài tập (bản chép), video YouTube trong nội dung bài học và file đính kèm.
 *
 * Mỗi thứ chỉ được đưa vào đúng một lần nhờ cờ `librarySynced` /
 * `libraryVideosSynced`, nên xóa một mục trong kho thì nó không tự quay lại.
 * Trang kho gọi hàm này mỗi lần mở (làm từng đợt nhỏ), script seed gọi đến khi xong.
 * Dùng import tương đối để chạy được cả trong app lẫn bằng `tsx` từ thư mục prisma.
 */

type Db = PrismaClient;

const YOUTUBE_LINE =
  /^https:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})\S*$/;

const KIND_BY_MIME: Record<string, LectureKind> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "SLIDE",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "DOC",
};

export const lectureKindOf = (mime: string): LectureKind =>
  KIND_BY_MIME[mime] ?? "PDF";

/** Thẻ từ tên bài học: bỏ phần trong ngoặc, cắt gọn 30 ký tự như giới hạn của kho. */
export function lessonTag(title: string) {
  return title
    .replace(/\(.*?\)/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 30)
    .trim();
}

/** Video trong nội dung Markdown: dòng chỉ có link YouTube, chú thích `_..._` ngay sau nếu có. */
export function lessonVideos(content: string) {
  const lines = content.split("\n").map((line) => line.trim());
  const videos: { youtubeId: string; caption: string }[] = [];
  for (const [index, line] of lines.entries()) {
    const match = YOUTUBE_LINE.exec(line);
    if (!match) continue;
    const next = lines.slice(index + 1).find((value) => value !== "") ?? "";
    const caption = /^_(.+)_$/.exec(next)?.[1]?.trim() ?? "";
    videos.push({ youtubeId: match[1], caption });
  }
  return videos;
}

/** Bộ chọn đủ dữ liệu để chép nguyên một bài tập (đề, giới hạn, test, câu hỏi). */
export const exerciseCopySelect = {
  title: true,
  prompt: true,
  kind: true,
  difficulty: true,
  points: true,
  timeLimitMs: true,
  memoryLimitKb: true,
  rubric: true,
  testCases: {
    orderBy: { id: "asc" as const },
    select: { input: true, expected: true, isHidden: true, weight: true },
  },
  quizQuestions: {
    orderBy: { position: "asc" as const },
    select: {
      position: true,
      prompt: true,
      options: true,
      answer: true,
      explanation: true,
    },
  },
};

export async function categoryNamed(db: Db, ownerId: string, name: string) {
  const clean = name.trim().slice(0, 60);
  return db.libraryCategory.upsert({
    where: { ownerId_name: { ownerId, name: clean } },
    create: { ownerId, name: clean },
    update: {},
    select: { id: true },
  });
}

/** Chép file đang có trong storage thành một bài giảng mới của kho (bản lưu trữ riêng). */
export async function storeLibraryCopy(
  db: Db,
  ownerId: string,
  source: {
    fileName: string;
    contentType: string;
    size: number;
    storageKey: string;
  },
  meta: { categoryId: string | null; tags?: string[] },
) {
  const ext = source.storageKey.split(".").pop() ?? "bin";
  const storageKey = `library/${randomUUID()}.${ext}`;
  const storage = getStorage();
  await storage.put(storageKey, await storage.get(source.storageKey));
  try {
    return await db.libraryLecture.create({
      data: {
        ownerId,
        kind: lectureKindOf(source.contentType),
        title: source.fileName,
        fileName: source.fileName,
        contentType: source.contentType,
        size: source.size,
        storageKey,
        categoryId: meta.categoryId,
        tags: meta.tags ?? [],
      },
      select: { id: true },
    });
  } catch (error) {
    await storage.delete(storageKey).catch(() => undefined);
    throw error;
  }
}

/** Thêm một video vào kho nếu giảng viên chưa có video này. */
export async function addVideoToLibrary(
  db: Db,
  ownerId: string,
  video: {
    youtubeId: string;
    title: string;
    categoryId: string | null;
    tags: string[];
  },
) {
  const existing = await db.libraryLecture.findFirst({
    where: { ownerId, youtubeId: video.youtubeId },
    select: { id: true },
  });
  if (existing) return false;
  await db.libraryLecture.create({
    data: {
      ownerId,
      kind: "VIDEO",
      youtubeId: video.youtubeId,
      title: video.title.slice(0, 120),
      categoryId: video.categoryId,
      tags: video.tags,
    },
  });
  return true;
}

export type SyncResult = {
  exercises: number;
  videos: number;
  files: number;
  fileErrors: string[];
  /** Còn việc cho lần sau (đợt này đã đủ số lượng). */
  more: boolean;
};

const ownerRooms = (ownerId: string) => ({
  path: { creatorId: ownerId, deletedAt: null },
});

export async function syncLibrary(
  db: Db,
  ownerId: string,
  options: { batch?: number; withFiles?: boolean } = {},
): Promise<SyncResult> {
  const batch = options.batch ?? 20;
  const result: SyncResult = {
    exercises: 0,
    videos: 0,
    files: 0,
    fileErrors: [],
    more: false,
  };

  // 1. Bài tập trong bài học chưa có bản trong kho.
  const exercises = await db.exercise.findMany({
    where: { librarySynced: false, room: ownerRooms(ownerId) },
    take: batch,
    select: {
      id: true,
      sourceId: true,
      ...exerciseCopySelect,
      room: { select: { title: true, path: { select: { title: true } } } },
    },
  });
  for (const {
    id,
    sourceId,
    room,
    testCases,
    quizQuestions,
    ...fields
  } of exercises) {
    if (!room) continue;
    const category = await categoryNamed(db, ownerId, room.path.title);
    const tags = [lessonTag(room.title)].filter(Boolean);
    await db.$transaction(async (tx) => {
      if (sourceId) {
        // Đã có bản trong kho từ trước khi có cờ: chỉ bổ sung phân loại còn trống.
        await tx.exercise.updateMany({
          where: { id: sourceId, roomId: null, libraryCategoryId: null },
          data: { libraryCategoryId: category.id },
        });
        await tx.exercise.updateMany({
          where: { id: sourceId, roomId: null, libraryTags: { isEmpty: true } },
          data: { libraryTags: tags },
        });
      } else {
        const copy = await tx.exercise.create({
          data: {
            ...fields,
            creatorId: ownerId,
            libraryCategoryId: category.id,
            libraryTags: tags,
            testCases: { create: testCases },
            quizQuestions: { create: quizQuestions },
          },
          select: { id: true },
        });
        await tx.exercise.update({
          where: { id },
          data: { sourceId: copy.id },
        });
        result.exercises += 1;
      }
      await tx.exercise.update({
        where: { id },
        data: { librarySynced: true, creatorId: ownerId },
      });
    });
  }
  if (exercises.length === batch) result.more = true;

  // 2. Video YouTube trong nội dung bài học.
  const rooms = await db.room.findMany({
    where: { libraryVideosSynced: false, ...ownerRooms(ownerId) },
    take: batch,
    select: {
      id: true,
      title: true,
      content: true,
      path: { select: { title: true } },
    },
  });
  for (const room of rooms) {
    const videos = lessonVideos(room.content);
    if (videos.length) {
      const category = await categoryNamed(db, ownerId, room.path.title);
      const tags = [lessonTag(room.title)].filter(Boolean);
      for (const video of videos)
        if (
          await addVideoToLibrary(db, ownerId, {
            youtubeId: video.youtubeId,
            title: video.caption || `${room.title}: video bài giảng`,
            categoryId: category.id,
            tags,
          })
        )
          result.videos += 1;
    }
    await db.room.update({
      where: { id: room.id },
      data: { libraryVideosSynced: true },
    });
  }
  if (rooms.length === batch) result.more = true;

  // 3. File đính kèm (cần quyền vào storage).
  if (options.withFiles === false) return result;
  const attachments = await db.roomAttachment.findMany({
    where: { librarySynced: false, room: ownerRooms(ownerId) },
    take: batch,
    select: {
      id: true,
      fileName: true,
      contentType: true,
      size: true,
      storageKey: true,
      room: { select: { title: true, path: { select: { title: true } } } },
    },
  });
  for (const { room, ...attachment } of attachments) {
    try {
      const category = await categoryNamed(db, ownerId, room.path.title);
      const lecture = await storeLibraryCopy(db, ownerId, attachment, {
        categoryId: category.id,
        tags: [lessonTag(room.title)].filter(Boolean),
      });
      await db.roomAttachment.update({
        where: { id: attachment.id },
        data: { libraryFileId: lecture.id, librarySynced: true },
      });
      result.files += 1;
    } catch (error) {
      // File hỏng hoặc đã mất: đánh dấu xong để không thử lại mỗi lần mở kho.
      await db.roomAttachment.update({
        where: { id: attachment.id },
        data: { librarySynced: true },
      });
      result.fileErrors.push(
        `${attachment.fileName}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  if (attachments.length === batch) result.more = true;
  return result;
}
