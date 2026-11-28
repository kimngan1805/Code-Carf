import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/features/auth/service";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { deleteExerciseSchema, parseSaveExercise } from "./authoring-schema";
import { exerciseRows } from "./rows";

type Tx = Prisma.TransactionClient;
type Teacher = Awaited<ReturnType<typeof requireRole>>;

/** Finds the room only when the teacher owns its path (admins see everything). */
async function findOwnedRoom(
  tx: Tx,
  user: Teacher,
  pathSlug: string,
  roomId: string,
) {
  const room = await tx.room.findFirst({
    where: {
      id: roomId,
      path: {
        slug: pathSlug,
        deletedAt: null,
        ...(user.role.name === "ADMIN" ? {} : { creatorId: user.id }),
      },
    },
    select: { id: true, path: { select: { slug: true, title: true } } },
  });
  if (!room)
    throw new AppError(
      404,
      "ROOM_NOT_FOUND",
      "Không tìm thấy bài học trong lộ trình bạn được quản lý.",
    );
  return room;
}

function isRetryable(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    ["P2034", "P2002"].includes(error.code)
  );
}

export async function saveManagedExercise(body: unknown) {
  const user = await requireRole(["TEACHER", "ADMIN"]);
  const parsed = parseSaveExercise(body);
  if (!parsed.success)
    throw new AppError(400, "INVALID_EXERCISE", parsed.message);
  const input = parsed.data;
  const { fields, testCases, questions } = exerciseRows(input);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db
        .$transaction(
          async (tx) => {
            const room = await findOwnedRoom(
              tx,
              user,
              input.pathSlug,
              input.roomId,
            );
            if ("exerciseId" in input) {
              const current = await tx.exercise.findFirst({
                where: { id: input.exerciseId, roomId: room.id },
                select: {
                  kind: true,
                  _count: { select: { submissions: true } },
                },
              });
              if (
                current &&
                current.kind !== input.kind &&
                current._count.submissions
              )
                throw new AppError(
                  409,
                  "EXERCISE_KIND_LOCKED",
                  "Bài tập đã có bài nộp nên không thể đổi loại.",
                );
              const updated = await tx.exercise.updateMany({
                where: { id: input.exerciseId, roomId: room.id },
                data: fields,
              });
              if (!updated.count)
                throw new AppError(
                  404,
                  "EXERCISE_NOT_FOUND",
                  "Không tìm thấy bài tập trong bài học này.",
                );
              await tx.testCase.deleteMany({
                where: { exerciseId: input.exerciseId },
              });
              await tx.quizQuestion.deleteMany({
                where: { exerciseId: input.exerciseId },
              });
              await tx.testCase.createMany({
                data: testCases.map((test) => ({
                  ...test,
                  exerciseId: input.exerciseId,
                })),
              });
              await tx.quizQuestion.createMany({
                data: questions.map((question) => ({
                  ...question,
                  exerciseId: input.exerciseId,
                })),
              });
              return { id: input.exerciseId, roomId: room.id };
            }
            const id = `x_${createHash("sha256").update(user.id).update("\0").update(room.id).update("\0").update(input.requestId).digest("hex")}`;
            const existing = await tx.exercise.findUnique({
              where: { id },
              select: { roomId: true, title: true, prompt: true },
            });
            if (existing) {
              if (
                existing.roomId !== room.id ||
                existing.title !== fields.title ||
                existing.prompt !== fields.prompt
              )
                throw new AppError(
                  409,
                  "EXERCISE_REQUEST_REUSED",
                  "Yêu cầu này đã lưu nội dung khác. Vui lòng thử lại.",
                );
              return { id, roomId: room.id };
            }
            // Mọi bài tạo trong bài học cũng có một bản riêng trong kho tài liệu của giảng viên,
            // xếp vào danh mục mang tên lộ trình.
            const category = await tx.libraryCategory.upsert({
              where: {
                ownerId_name: { ownerId: user.id, name: room.path.title },
              },
              create: { ownerId: user.id, name: room.path.title },
              update: {},
              select: { id: true },
            });
            const library = await tx.exercise.create({
              data: {
                creatorId: user.id,
                libraryCategoryId: category.id,
                ...fields,
                testCases: { create: testCases },
                quizQuestions: { create: questions },
              },
              select: { id: true },
            });
            await tx.exercise.create({
              data: {
                id,
                roomId: room.id,
                creatorId: user.id,
                sourceId: library.id,
                librarySynced: true,
                ...fields,
                testCases: { create: testCases },
                quizQuestions: { create: questions },
              },
            });
            return { id, roomId: room.id };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        )
        .then((saved) => ({ ...saved, slug: input.pathSlug }));
    } catch (error) {
      if (isRetryable(error)) continue;
      throw error;
    }
  }
  throw new AppError(
    409,
    "EXERCISE_BUSY",
    "Bài học đang được cập nhật. Vui lòng lưu lại.",
  );
}

export async function deleteManagedExercise(body: unknown) {
  const user = await requireRole(["TEACHER", "ADMIN"]);
  const parsed = deleteExerciseSchema.safeParse(body);
  if (!parsed.success)
    throw new AppError(400, "INVALID_EXERCISE", "Yêu cầu xóa không hợp lệ.");
  const input = parsed.data;
  return db.$transaction(async (tx) => {
    const room = await findOwnedRoom(tx, user, input.pathSlug, input.roomId);
    const exercise = await tx.exercise.findFirst({
      where: { id: input.exerciseId, roomId: room.id },
      select: {
        id: true,
        _count: { select: { submissions: true, contests: true } },
      },
    });
    if (!exercise)
      throw new AppError(
        404,
        "EXERCISE_NOT_FOUND",
        "Không tìm thấy bài tập trong bài học này.",
      );
    if (exercise._count.submissions || exercise._count.contests)
      throw new AppError(
        409,
        "EXERCISE_IN_USE",
        "Bài tập đã có bài nộp hoặc nằm trong cuộc thi nên không thể xóa.",
      );
    await tx.exercise.delete({ where: { id: exercise.id } });
    return { roomId: room.id, slug: input.pathSlug };
  });
}
