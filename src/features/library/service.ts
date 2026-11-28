import { randomUUID } from "node:crypto";
import {
  LectureKind,
  LibraryStatus,
  LibraryVisibility,
  Prisma,
  RoleName,
} from "@prisma/client";
import { z } from "zod";
import { requireRole } from "@/features/auth/service";
import { exerciseFieldsSchema } from "@/features/exercises/authoring-schema";
import {
  copyData,
  exerciseCopySelect,
  exerciseRows,
} from "@/features/exercises/rows";
import {
  addVideoToLibrary,
  categoryNamed,
  lectureKindOf,
  lessonTag,
  storeLibraryCopy,
  syncLibrary,
} from "./sync";
import {
  ATTACHMENT_TYPES,
  MAX_ATTACHMENTS_PER_ROOM,
  validateAttachment,
  type UploadedAttachment,
} from "@/features/rooms/attachment-rules";
import { addLessonVideo } from "@/features/rooms/authoring";
import { youtubeVideoId } from "@/features/rooms/youtube";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getStorage } from "@/lib/storage";

type Teacher = Awaited<ReturnType<typeof requireTeacher>>;

export const requireTeacher = () =>
  requireRole([RoleName.TEACHER, RoleName.ADMIN]);

const EXERCISE_NOT_FOUND = () =>
  new AppError(404, "EXERCISE_NOT_FOUND", "Không tìm thấy bài tập trong kho.");
const LECTURE_NOT_FOUND = () =>
  new AppError(404, "FILE_NOT_FOUND", "Không tìm thấy bài giảng trong kho.");
const CATEGORY_NOT_FOUND = () =>
  new AppError(404, "CATEGORY_NOT_FOUND", "Không tìm thấy danh mục.");
const ROOM_NOT_FOUND = () =>
  new AppError(
    404,
    "ROOM_NOT_FOUND",
    "Không tìm thấy bài học bạn được quản lý.",
  );

export const MAX_LIBRARY_TAGS = 8;

/** Bài tập trong kho của mình: không thuộc bài học nào (bản trong bài học là bản chép). */
const ownExercises = (user: Teacher) => ({
  creatorId: user.id,
  roomId: null,
});

/** Bài tập giảng viên khác chia sẻ, đã sẵn sàng dùng. */
const sharedExercises = (user: Teacher) => ({
  creatorId: { not: user.id },
  roomId: null,
  libraryVisibility: LibraryVisibility.SHARED,
  libraryStatus: LibraryStatus.READY,
});

/** Bài tập được phép lấy dùng: của mình (chưa lưu trữ) hoặc được chia sẻ. */
const usableExercise = (user: Teacher, id: string) => ({
  id,
  roomId: null,
  OR: [
    { creatorId: user.id, libraryStatus: { not: LibraryStatus.ARCHIVED } },
    {
      libraryVisibility: LibraryVisibility.SHARED,
      libraryStatus: LibraryStatus.READY,
    },
  ],
});

const usableLecture = (user: Teacher, id: string) => ({
  id,
  OR: [
    { ownerId: user.id, status: { not: LibraryStatus.ARCHIVED } },
    { visibility: LibraryVisibility.SHARED, status: LibraryStatus.READY },
  ],
});

/** Bài học mà giảng viên (hoặc admin) được sửa. */
async function findManagedRoom(user: Teacher, roomId: string) {
  const room = await db.room.findFirst({
    where: {
      id: roomId,
      path: {
        deletedAt: null,
        ...(user.role.name === RoleName.ADMIN ? {} : { creatorId: user.id }),
      },
    },
    select: { id: true, title: true, path: { select: { slug: true } } },
  });
  if (!room) throw ROOM_NOT_FOUND();
  return room;
}

async function removeQuietly(key: string) {
  try {
    await getStorage().delete(key);
  } catch (error) {
    logger.error("library_file_delete_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function requireOwnCategory(user: Teacher, categoryId: string | null) {
  if (!categoryId) return null;
  const category = await db.libraryCategory.findFirst({
    where: { id: categoryId, ownerId: user.id },
    select: { id: true },
  });
  if (!category) throw CATEGORY_NOT_FOUND();
  return category.id;
}

/** Thẻ: bỏ trống, bỏ trùng không phân biệt hoa thường, tối đa MAX_LIBRARY_TAGS. */
export function cleanTags(tags: readonly string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim().replace(/^#/, "").slice(0, 30);
    if (!tag || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    result.push(tag);
  }
  return result.slice(0, MAX_LIBRARY_TAGS);
}

/** Lần mở kho nào cũng đưa thêm một đợt đồ có sẵn trong lộ trình vào kho (mỗi thứ một lần). */
async function backfillLibrary(user: Teacher) {
  try {
    await syncLibrary(db, user.id, { batch: 20 });
  } catch (error) {
    // Đồng bộ chỉ là phần thêm: lỗi ở đây không được làm hỏng trang kho.
    logger.error("library_sync_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

const EXERCISE_KINDS = ["CODE", "QUIZ", "HANDWRITTEN"] as const;
export type LibraryKind = (typeof EXERCISE_KINDS)[number];
const LECTURE_KINDS: readonly LectureKind[] = ["VIDEO", "PDF", "SLIDE", "DOC"];
const STATUSES: readonly LibraryStatus[] = ["DRAFT", "READY", "ARCHIVED"];
const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;

export type LibraryFilters = {
  scope?: string;
  q?: string;
  kind?: string;
  lecture?: string;
  category?: string;
  status?: string;
  difficulty?: string;
  tag?: string;
};

const pick = <T extends string>(values: readonly T[], value?: string) =>
  values.find((item) => item === value);

export async function getLibrary(filters: LibraryFilters) {
  const user = await requireTeacher();
  await backfillLibrary(user);
  const shared = filters.scope === "chia-se";
  const q = filters.q?.trim().slice(0, 100) ?? "";
  const kind = pick(EXERCISE_KINDS, filters.kind);
  const lectureKind = pick(LECTURE_KINDS, filters.lecture);
  const status = pick(STATUSES, filters.status);
  const difficulty = pick(DIFFICULTIES, filters.difficulty);
  const tag = filters.tag?.trim().slice(0, 30) || undefined;
  const category = shared ? undefined : filters.category || undefined;

  // Mặc định ẩn đồ đã lưu trữ; chọn trạng thái "Lưu trữ" mới thấy.
  const exerciseScope = shared ? sharedExercises(user) : ownExercises(user);
  const exerciseStatus = shared
    ? {}
    : { libraryStatus: status ?? { not: LibraryStatus.ARCHIVED } };
  const lectureScope = shared
    ? {
        ownerId: { not: user.id },
        visibility: LibraryVisibility.SHARED,
        status: LibraryStatus.READY,
      }
    : { ownerId: user.id, status: status ?? { not: LibraryStatus.ARCHIVED } };

  const exerciseWhere = {
    ...exerciseScope,
    ...exerciseStatus,
    ...(category ? { libraryCategoryId: category } : {}),
    ...(tag ? { libraryTags: { has: tag } } : {}),
    ...(difficulty ? { difficulty } : {}),
    ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
  };
  const lectureWhere = {
    ...lectureScope,
    ...(category ? { categoryId: category } : {}),
    ...(tag ? { tags: { has: tag } } : {}),
    ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [exercises, lectures, exerciseKinds, lectureKinds, categories] =
    await Promise.all([
      db.exercise.findMany({
        where: { ...exerciseWhere, ...(kind ? { kind } : {}) },
        orderBy: { createdAt: "desc" },
        take: 200,
        select: {
          id: true,
          title: true,
          kind: true,
          difficulty: true,
          points: true,
          prompt: true,
          rubric: true,
          createdAt: true,
          libraryTags: true,
          libraryStatus: true,
          libraryVisibility: true,
          libraryCategory: { select: { id: true, name: true } },
          creator: { select: { name: true } },
          testCases: {
            orderBy: { id: "asc" },
            select: { input: true, expected: true, isHidden: true },
          },
          quizQuestions: {
            orderBy: { position: "asc" },
            select: {
              prompt: true,
              options: true,
              answer: true,
              explanation: true,
            },
          },
          copies: {
            where: { room: { path: { deletedAt: null } } },
            select: { room: { select: { title: true } } },
          },
        },
      }),
      db.libraryLecture.findMany({
        where: {
          ...lectureWhere,
          ...(lectureKind ? { kind: lectureKind } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 200,
        select: {
          id: true,
          kind: true,
          title: true,
          youtubeId: true,
          fileName: true,
          contentType: true,
          size: true,
          createdAt: true,
          tags: true,
          status: true,
          visibility: true,
          category: { select: { id: true, name: true } },
          owner: { select: { name: true } },
          attachments: {
            where: { room: { path: { deletedAt: null } } },
            select: { room: { select: { title: true } } },
          },
        },
      }),
      db.exercise.groupBy({
        by: ["kind"],
        where: exerciseWhere,
        _count: true,
      }),
      db.libraryLecture.groupBy({
        by: ["kind"],
        where: lectureWhere,
        _count: true,
      }),
      db.libraryCategory.findMany({
        where: { ownerId: user.id },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              exercises: {
                where: {
                  roomId: null,
                  libraryStatus: { not: LibraryStatus.ARCHIVED },
                },
              },
              lectures: { where: { status: { not: LibraryStatus.ARCHIVED } } },
            },
          },
        },
      }),
    ]);

  const tagRows = shared
    ? []
    : await db.exercise.findMany({
        where: { ...ownExercises(user), libraryTags: { isEmpty: false } },
        select: { libraryTags: true },
        take: 500,
      });
  const lectureTagRows = shared
    ? []
    : await db.libraryLecture.findMany({
        where: { ownerId: user.id, tags: { isEmpty: false } },
        select: { tags: true },
        take: 500,
      });
  const tagCounts = new Map<string, number>();
  for (const tags of [
    ...tagRows.map((row) => row.libraryTags),
    ...lectureTagRows.map((row) => row.tags),
  ])
    for (const value of tags)
      tagCounts.set(value, (tagCounts.get(value) ?? 0) + 1);

  return {
    shared,
    exercises: exercises.map(({ copies, ...exercise }) => ({
      ...exercise,
      usedIn: copies.map((copy) => copy.room?.title ?? ""),
    })),
    lectures: lectures.map(({ attachments, ...lecture }) => ({
      ...lecture,
      usedIn: attachments.map((attachment) => attachment.room.title),
    })),
    exerciseCounts: Object.fromEntries(
      exerciseKinds.map((row) => [row.kind, row._count]),
    ) as Partial<Record<LibraryKind, number>>,
    lectureCounts: Object.fromEntries(
      lectureKinds.map((row) => [row.kind, row._count]),
    ) as Partial<Record<LectureKind, number>>,
    categories: categories.map((item) => ({
      id: item.id,
      name: item.name,
      count: item._count.exercises + item._count.lectures,
    })),
    tags: [...tagCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([value]) => value),
  };
}

export type LibraryView = Awaited<ReturnType<typeof getLibrary>>;

/** Danh sách gọn để chọn trong hộp thoại "Thêm nội dung" của bài học: của mình và được chia sẻ. */
export async function getLibraryPicker() {
  const user = await requireTeacher();
  await backfillLibrary(user);
  const [exercises, lectures] = await Promise.all([
    db.exercise.findMany({
      where: {
        roomId: null,
        OR: [
          {
            creatorId: user.id,
            libraryStatus: { not: LibraryStatus.ARCHIVED },
          },
          sharedExercises(user),
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true,
        title: true,
        kind: true,
        points: true,
        creatorId: true,
        libraryCategory: { select: { name: true } },
        creator: { select: { name: true } },
      },
    }),
    db.libraryLecture.findMany({
      where: {
        OR: [
          { ownerId: user.id, status: { not: LibraryStatus.ARCHIVED } },
          {
            ownerId: { not: user.id },
            visibility: LibraryVisibility.SHARED,
            status: LibraryStatus.READY,
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: {
        id: true,
        kind: true,
        title: true,
        size: true,
        ownerId: true,
        category: { select: { name: true } },
        owner: { select: { name: true } },
      },
    }),
  ]);
  const mine = (ownerId: string | null) => ownerId === user.id;
  return {
    exercises: exercises.map(
      ({ creatorId, libraryCategory, creator, ...item }) => ({
        ...item,
        category: libraryCategory?.name ?? null,
        sharedBy: mine(creatorId) ? null : (creator?.name ?? "Giảng viên"),
      }),
    ),
    lectures: lectures.map(({ ownerId, category, owner, ...item }) => ({
      ...item,
      category: category?.name ?? null,
      sharedBy: mine(ownerId) ? null : owner.name,
    })),
  };
}

export type LibraryPicker = Awaited<ReturnType<typeof getLibraryPicker>>;

export async function getLibraryCategories() {
  const user = await requireTeacher();
  return db.libraryCategory.findMany({
    where: { ownerId: user.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function getLibraryExercise(exerciseId: string) {
  const user = await requireTeacher();
  const exercise = await db.exercise.findFirst({
    where: { id: exerciseId, ...ownExercises(user) },
    select: {
      id: true,
      title: true,
      prompt: true,
      kind: true,
      difficulty: true,
      points: true,
      timeLimitMs: true,
      memoryLimitKb: true,
      rubric: true,
      libraryCategoryId: true,
      libraryTags: true,
      libraryStatus: true,
      libraryVisibility: true,
      testCases: {
        orderBy: { id: "asc" },
        select: { input: true, expected: true, isHidden: true, weight: true },
      },
      quizQuestions: {
        orderBy: { position: "asc" },
        select: {
          prompt: true,
          options: true,
          answer: true,
          explanation: true,
        },
      },
    },
  });
  if (!exercise) throw EXERCISE_NOT_FOUND();
  return exercise;
}

/** Phân loại và chia sẻ của một mục trong kho. */
export const libraryMetaSchema = z
  .object({
    categoryId: z.string().min(1).max(200).nullable().default(null),
    tags: z.array(z.string().max(40)).max(20).default([]),
    status: z.enum(["DRAFT", "READY", "ARCHIVED"]).default("READY"),
    visibility: z.enum(["PRIVATE", "SHARED"]).default("PRIVATE"),
  })
  .strict();
export type LibraryMeta = z.infer<typeof libraryMetaSchema>;

const libraryScope = z.union([
  z.object({ requestId: z.uuid() }).strict(),
  z.object({ exerciseId: z.string().min(1).max(200) }).strict(),
]);

/** Tạo hoặc sửa bài tập ngay trong kho. Bản đã chép vào bài học không bị đổi theo. */
export async function saveLibraryExercise(body: unknown) {
  const user = await requireTeacher();
  if (!body || typeof body !== "object")
    throw new AppError(
      400,
      "INVALID_EXERCISE",
      "Thông tin bài tập không hợp lệ.",
    );
  const { requestId, exerciseId, meta, ...rest } = body as Record<
    string,
    unknown
  >;
  const scope = libraryScope.safeParse(
    requestId !== undefined ? { requestId } : { exerciseId },
  );
  const parsed = exerciseFieldsSchema.safeParse(rest);
  const parsedMeta = libraryMetaSchema.safeParse(meta ?? {});
  if (!scope.success || !parsedMeta.success)
    throw new AppError(
      400,
      "INVALID_EXERCISE",
      "Thông tin bài tập không hợp lệ.",
    );
  if (!parsed.success)
    throw new AppError(
      400,
      "INVALID_EXERCISE",
      parsed.error.issues[0]?.message ?? "Thông tin bài tập không hợp lệ.",
    );
  const { fields, testCases, questions } = exerciseRows(parsed.data);
  const libraryFields = {
    libraryCategoryId: await requireOwnCategory(
      user,
      parsedMeta.data.categoryId,
    ),
    libraryTags: cleanTags(parsedMeta.data.tags),
    libraryStatus: parsedMeta.data.status,
    libraryVisibility: parsedMeta.data.visibility,
  };

  if ("exerciseId" in scope.data) {
    const id = scope.data.exerciseId;
    return db.$transaction(async (tx) => {
      const updated = await tx.exercise.updateMany({
        where: { id, ...ownExercises(user) },
        data: { ...fields, ...libraryFields },
      });
      if (!updated.count) throw EXERCISE_NOT_FOUND();
      await tx.testCase.deleteMany({ where: { exerciseId: id } });
      await tx.quizQuestion.deleteMany({ where: { exerciseId: id } });
      await tx.testCase.createMany({
        data: testCases.map((test) => ({ ...test, exerciseId: id })),
      });
      await tx.quizQuestion.createMany({
        data: questions.map((question) => ({ ...question, exerciseId: id })),
      });
      return { id };
    });
  }

  // Cùng một requestId luôn ra cùng id, bấm lưu lại sau khi mất mạng không tạo trùng.
  const id = `lib_${user.id}_${scope.data.requestId}`;
  const existing = await db.exercise.findUnique({
    where: { id },
    select: { creatorId: true },
  });
  if (existing) {
    if (existing.creatorId !== user.id) throw EXERCISE_NOT_FOUND();
    return { id };
  }
  try {
    await db.exercise.create({
      data: {
        id,
        creatorId: user.id,
        ...fields,
        ...libraryFields,
        testCases: { create: testCases },
        quizQuestions: { create: questions },
      },
    });
  } catch (error) {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== "P2002"
    )
      throw error;
  }
  return { id };
}

const metaUpdateSchema = z
  .object({
    target: z.enum(["exercise", "lecture"]),
    id: z.string().min(1).max(200),
    title: z.string().trim().min(1).max(120).optional(),
    meta: libraryMetaSchema,
  })
  .strict();

/** Đổi danh mục, thẻ, trạng thái, chia sẻ (và tên bài giảng) của một mục trong kho. */
export async function updateLibraryMeta(input: unknown) {
  const user = await requireTeacher();
  const parsed = metaUpdateSchema.safeParse(input);
  if (!parsed.success)
    throw new AppError(400, "INVALID_META", "Thông tin không hợp lệ.");
  const { target, id, meta, title } = parsed.data;
  const categoryId = await requireOwnCategory(user, meta.categoryId);
  const tags = cleanTags(meta.tags);
  if (target === "exercise") {
    const updated = await db.exercise.updateMany({
      where: { id, ...ownExercises(user) },
      data: {
        libraryCategoryId: categoryId,
        libraryTags: tags,
        libraryStatus: meta.status,
        libraryVisibility: meta.visibility,
      },
    });
    if (!updated.count) throw EXERCISE_NOT_FOUND();
    return;
  }
  const updated = await db.libraryLecture.updateMany({
    where: { id, ownerId: user.id },
    data: {
      categoryId,
      tags,
      status: meta.status,
      visibility: meta.visibility,
      ...(title ? { title } : {}),
    },
  });
  if (!updated.count) throw LECTURE_NOT_FOUND();
}

/** Xóa khỏi kho. Các bản đã chép vào bài học vẫn giữ nguyên. */
export async function deleteLibraryExercise(exerciseId: string) {
  const user = await requireTeacher();
  const exercise = await db.exercise.findFirst({
    where: { id: exerciseId, ...ownExercises(user) },
    select: {
      id: true,
      _count: { select: { submissions: true, contests: true } },
    },
  });
  if (!exercise) throw EXERCISE_NOT_FOUND();
  if (exercise._count.submissions || exercise._count.contests)
    throw new AppError(
      409,
      "EXERCISE_IN_USE",
      "Bài tập đã có bài nộp hoặc nằm trong cuộc thi nên không thể xóa.",
    );
  await db.exercise.delete({ where: { id: exercise.id } });
}

/** Chép một bài tập (của mình hoặc được chia sẻ) vào cuối danh sách bài tập của bài học. */
export async function copyExerciseToRoom(input: {
  exerciseId: string;
  roomId: string;
}) {
  const user = await requireTeacher();
  const room = await findManagedRoom(user, input.roomId);
  const source = await db.exercise.findFirst({
    where: usableExercise(user, input.exerciseId),
    select: exerciseCopySelect,
  });
  if (!source) throw EXERCISE_NOT_FOUND();
  const copy = await db.exercise.create({
    data: {
      roomId: room.id,
      creatorId: user.id,
      sourceId: input.exerciseId,
      librarySynced: true,
      ...copyData(source),
    },
    select: { id: true },
  });
  return { id: copy.id, roomId: room.id, slug: room.path.slug };
}

/** Lưu một mục giảng viên khác chia sẻ về kho của mình (bản riêng, sửa thoải mái). */
export async function saveSharedToMine(input: {
  exerciseId?: string;
  lectureId?: string;
}) {
  const user = await requireTeacher();
  if (input.exerciseId) {
    const source = await db.exercise.findFirst({
      where: { ...sharedExercises(user), id: input.exerciseId },
      select: { ...exerciseCopySelect, libraryTags: true },
    });
    if (!source) throw EXERCISE_NOT_FOUND();
    const { libraryTags, ...rest } = source;
    await db.exercise.create({
      data: {
        creatorId: user.id,
        sourceId: input.exerciseId,
        libraryTags,
        libraryStatus: LibraryStatus.DRAFT,
        ...copyData(rest),
      },
    });
    return;
  }
  const lecture = await db.libraryLecture.findFirst({
    where: {
      id: input.lectureId,
      ownerId: { not: user.id },
      visibility: LibraryVisibility.SHARED,
      status: LibraryStatus.READY,
    },
    select: {
      kind: true,
      title: true,
      youtubeId: true,
      fileName: true,
      contentType: true,
      size: true,
      storageKey: true,
      tags: true,
    },
  });
  if (!lecture) throw LECTURE_NOT_FOUND();
  if (lecture.kind === LectureKind.VIDEO || !lecture.storageKey) {
    await db.libraryLecture.create({
      data: {
        ownerId: user.id,
        kind: lecture.kind,
        title: lecture.title,
        youtubeId: lecture.youtubeId,
        tags: lecture.tags,
        status: LibraryStatus.DRAFT,
      },
    });
    return;
  }
  const created = await storeLibraryCopy(
    db,
    user.id,
    {
      fileName: lecture.fileName ?? lecture.title,
      contentType: lecture.contentType ?? ATTACHMENT_TYPES.pdf.mime,
      size: lecture.size ?? 0,
      storageKey: lecture.storageKey,
    },
    { categoryId: null },
  );
  await db.libraryLecture.update({
    where: { id: created.id },
    data: {
      title: lecture.title,
      tags: lecture.tags,
      status: LibraryStatus.DRAFT,
    },
  });
}

const uploadMetaSchema = z.object({
  categoryId: z.string().min(1).max(200).nullable(),
});

export async function uploadLibraryFile(
  file: UploadedAttachment,
  options: { categoryId: string | null } = { categoryId: null },
) {
  const user = await requireTeacher();
  const type = validateAttachment(file);
  const { categoryId } = uploadMetaSchema.parse(options);
  const ownCategory = await requireOwnCategory(user, categoryId);
  const storageKey = `library/${randomUUID()}.${type.ext}`;
  await getStorage().put(storageKey, Buffer.from(file.bytes));
  try {
    return await db.libraryLecture.create({
      data: {
        ownerId: user.id,
        kind: lectureKindOf(type.mime),
        title: type.fileName,
        fileName: type.fileName,
        contentType: type.mime,
        size: file.bytes.length,
        storageKey,
        categoryId: ownCategory,
      },
      select: { id: true, title: true },
    });
  } catch (error) {
    await removeQuietly(storageKey);
    throw error;
  }
}

const videoSchema = z
  .object({
    url: z.string().trim().min(1, "Hãy dán link video YouTube.").max(500),
    title: z.string().trim().max(120).default(""),
    categoryId: z.string().min(1).max(200).nullable().default(null),
  })
  .strict();

/** Thêm một video YouTube vào kho bài giảng. */
export async function addLibraryVideo(input: unknown) {
  const user = await requireTeacher();
  const parsed = videoSchema.safeParse(input);
  if (!parsed.success)
    throw new AppError(
      400,
      "INVALID_VIDEO",
      parsed.error.issues[0]?.message ?? "Thông tin video không hợp lệ.",
    );
  const youtubeId = youtubeVideoId(parsed.data.url);
  if (!youtubeId)
    throw new AppError(
      400,
      "INVALID_VIDEO",
      "Link không phải video YouTube hợp lệ.",
    );
  return db.libraryLecture.create({
    data: {
      ownerId: user.id,
      kind: LectureKind.VIDEO,
      title: parsed.data.title || `Video ${youtubeId}`,
      youtubeId,
      categoryId: await requireOwnCategory(user, parsed.data.categoryId),
    },
    select: { id: true },
  });
}

/** Xóa bài giảng khỏi kho. Bản đã chép vào bài học có bản lưu trữ riêng nên vẫn còn. */
export async function deleteLibraryLecture(lectureId: string) {
  const user = await requireTeacher();
  const lecture = await db.libraryLecture.findFirst({
    where: { id: lectureId, ownerId: user.id },
    select: { id: true, storageKey: true },
  });
  if (!lecture) throw LECTURE_NOT_FOUND();
  await db.libraryLecture.delete({ where: { id: lecture.id } });
  if (lecture.storageKey) await removeQuietly(lecture.storageKey);
}

/** File của một bài giảng: của mình, hoặc được chia sẻ. */
export async function readLibraryFile(lectureId: string) {
  const user = await requireTeacher();
  const lecture = await db.libraryLecture.findFirst({
    where: {
      id: lectureId,
      OR: [
        { ownerId: user.id },
        { visibility: LibraryVisibility.SHARED, status: LibraryStatus.READY },
      ],
    },
    select: { fileName: true, contentType: true, storageKey: true },
  });
  if (!lecture?.storageKey || !lecture.contentType) throw LECTURE_NOT_FOUND();
  return {
    bytes: await getStorage().get(lecture.storageKey),
    fileName: lecture.fileName ?? "bai-giang",
    contentType: lecture.contentType,
  };
}

/** Đưa bài giảng vào bài học: video chèn vào mục Video bài giảng, file chép thành tài liệu đính kèm. */
export async function copyLectureToRoom(input: {
  lectureId: string;
  roomId: string;
}) {
  const user = await requireTeacher();
  const room = await findManagedRoom(user, input.roomId);
  const lecture = await db.libraryLecture.findFirst({
    where: usableLecture(user, input.lectureId),
    select: {
      id: true,
      kind: true,
      title: true,
      youtubeId: true,
      fileName: true,
      contentType: true,
      size: true,
      storageKey: true,
    },
  });
  if (!lecture) throw LECTURE_NOT_FOUND();

  if (lecture.kind === LectureKind.VIDEO) {
    if (!lecture.youtubeId) throw LECTURE_NOT_FOUND();
    await addLessonVideo({
      pathSlug: room.path.slug,
      roomId: room.id,
      url: `https://www.youtube.com/watch?v=${lecture.youtubeId}`,
      caption: lecture.title.startsWith("Video ") ? "" : lecture.title,
    });
    return { roomId: room.id, slug: room.path.slug };
  }

  if (!lecture.storageKey || !lecture.contentType) throw LECTURE_NOT_FOUND();
  if (
    (await db.roomAttachment.count({ where: { roomId: room.id } })) >=
    MAX_ATTACHMENTS_PER_ROOM
  )
    throw new AppError(
      400,
      "TOO_MANY_ATTACHMENTS",
      `Mỗi bài học có tối đa ${MAX_ATTACHMENTS_PER_ROOM} tài liệu.`,
    );
  const ext = lecture.storageKey.split(".").pop() ?? "bin";
  const storageKey = `room-attachments/${randomUUID()}.${ext}`;
  const storage = getStorage();
  await storage.put(storageKey, await storage.get(lecture.storageKey));
  try {
    const last = await db.roomAttachment.aggregate({
      where: { roomId: room.id },
      _max: { position: true },
    });
    await db.roomAttachment.create({
      data: {
        roomId: room.id,
        // Chỉ ghi nguồn khi là bài giảng của chính mình, để đếm "đang dùng" trong kho.
        libraryFileId: lecture.id,
        librarySynced: true,
        fileName: lecture.fileName ?? lecture.title,
        contentType: lecture.contentType,
        size: lecture.size ?? 0,
        storageKey,
        position: (last._max.position ?? 0) + 1,
      },
    });
  } catch (error) {
    await removeQuietly(storageKey);
    throw error;
  }
  return { roomId: room.id, slug: room.path.slug };
}

/**
 * Sau khi thêm video vào một bài học: đưa video vào kho của người sở hữu lộ trình.
 * Chỉ là phần phụ nên mọi lỗi đều bị bỏ qua (đã ghi log).
 */
export async function addLessonVideoToLibrary(input: unknown) {
  try {
    const { roomId, url, caption } = (input ?? {}) as Record<string, unknown>;
    const youtubeId =
      typeof url === "string" ? youtubeVideoId(url.trim()) : null;
    if (typeof roomId !== "string" || !youtubeId) return;
    const room = await db.room.findUnique({
      where: { id: roomId },
      select: {
        title: true,
        path: { select: { title: true, creatorId: true } },
      },
    });
    if (!room) return;
    const category = await categoryNamed(
      db,
      room.path.creatorId,
      room.path.title,
    );
    await addVideoToLibrary(db, room.path.creatorId, {
      youtubeId,
      title:
        (typeof caption === "string" && caption.trim()) ||
        `${room.title}: video bài giảng`,
      categoryId: category.id,
      tags: [lessonTag(room.title)].filter(Boolean),
    });
  } catch (error) {
    logger.error("library_video_copy_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/** Sau khi tải file lên một bài học: lưu thêm một bản vào kho, xếp vào danh mục tên lộ trình. */
export async function addRoomUploadToLibrary(
  ownerId: string,
  attachmentId: string,
) {
  try {
    const attachment = await db.roomAttachment.findUnique({
      where: { id: attachmentId },
      select: {
        fileName: true,
        contentType: true,
        size: true,
        storageKey: true,
        room: { select: { title: true, path: { select: { title: true } } } },
      },
    });
    if (!attachment) return;
    const { room, ...file } = attachment;
    const category = await categoryNamed(db, ownerId, room.path.title);
    const lecture = await storeLibraryCopy(db, ownerId, file, {
      categoryId: category.id,
      tags: [lessonTag(room.title)].filter(Boolean),
    });
    await db.roomAttachment.update({
      where: { id: attachmentId },
      data: { libraryFileId: lecture.id, librarySynced: true },
    });
  } catch (error) {
    // Kho chỉ là bản phụ: lỗi ở đây không làm hỏng lần tải lên bài học.
    logger.error("library_copy_failed", {
      attachmentId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

const categoryName = z
  .string()
  .trim()
  .min(1, "Hãy nhập tên danh mục.")
  .max(60, "Tên danh mục tối đa 60 ký tự.");

export async function createLibraryCategory(name: unknown) {
  const user = await requireTeacher();
  const parsed = categoryName.safeParse(name);
  if (!parsed.success)
    throw new AppError(400, "INVALID_CATEGORY", parsed.error.issues[0].message);
  return categoryNamed(db, user.id, parsed.data);
}

export async function renameLibraryCategory(id: string, name: unknown) {
  const user = await requireTeacher();
  const parsed = categoryName.safeParse(name);
  if (!parsed.success)
    throw new AppError(400, "INVALID_CATEGORY", parsed.error.issues[0].message);
  try {
    const updated = await db.libraryCategory.updateMany({
      where: { id, ownerId: user.id },
      data: { name: parsed.data },
    });
    if (!updated.count) throw CATEGORY_NOT_FOUND();
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new AppError(409, "CATEGORY_EXISTS", "Đã có danh mục tên này.");
    throw error;
  }
}

/** Xóa danh mục: các mục bên trong vẫn còn, chỉ chuyển sang "Chưa phân loại". */
export async function deleteLibraryCategory(id: string) {
  const user = await requireTeacher();
  const deleted = await db.libraryCategory.deleteMany({
    where: { id, ownerId: user.id },
  });
  if (!deleted.count) throw CATEGORY_NOT_FOUND();
}
