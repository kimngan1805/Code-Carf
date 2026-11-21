import { randomUUID } from "node:crypto";
import { ExerciseKind, RoleName } from "@prisma/client";
import { requireRole } from "@/features/auth/service";
import { getContestEntry } from "@/features/contests/service";
import { canAccessRoom } from "@/features/rooms/access";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getStorage } from "@/lib/storage";
import {
  findExerciseForUpload,
  findOwnUpload,
  findSubmissionImage,
  isExerciseInContest,
  saveHandwrittenImage,
} from "./repository";
import {
  mimeFromStorageKey,
  validateHandwrittenImage,
  type UploadedImage,
} from "./rules";

const NOT_FOUND = () =>
  new AppError(404, "NOT_FOUND", "Không tìm thấy ảnh bài làm.");

/**
 * Who is uploading and for what. The user always comes from the session, never
 * from the request. Practice needs an unlocked room; a contest upload needs a
 * running attempt (the deadline check lives in `getContestEntry`).
 */
async function resolveTarget(exerciseId: string, contestSlug: string | null) {
  let userId: string;
  let contestId: string | null = null;
  if (contestSlug) {
    const entry = await getContestEntry(contestSlug);
    userId = entry.userId;
    contestId = entry.contest.id;
  } else {
    userId = (await requireRole([RoleName.STUDENT])).id;
  }

  const exercise = exerciseId ? await findExerciseForUpload(exerciseId) : null;
  if (!exercise)
    throw new AppError(404, "EXERCISE_NOT_FOUND", "Không tìm thấy bài tập.");
  if (exercise.kind !== ExerciseKind.HANDWRITTEN)
    throw new AppError(
      400,
      "EXERCISE_NOT_HANDWRITTEN",
      "Bài tập này không nhận ảnh bài viết tay.",
    );

  if (contestId) {
    if (!(await isExerciseInContest(contestId, exerciseId)))
      throw new AppError(
        404,
        "EXERCISE_NOT_IN_CONTEST",
        "Bài tập không thuộc cuộc thi này.",
      );
  } else if (!exercise.room || !exercise.room.path.published) {
    throw new AppError(404, "EXERCISE_NOT_FOUND", "Không tìm thấy bài tập.");
  } else if (!(await canAccessRoom(userId, exercise.room.id))) {
    throw new AppError(403, "ROOM_LOCKED", "Bài học đang khóa.");
  }
  return { userId, contestId };
}

/**
 * Stores the learner's photo of their handwritten answer in private storage
 * and records it on their submission. Uploading again replaces the earlier
 * image (one submission per learner and exercise) until it has been graded, or
 * in a contest until the attempt's deadline.
 */
export async function uploadHandwrittenImage(input: {
  exerciseId: string;
  contestSlug?: string | null;
  file: UploadedImage;
}) {
  const { userId, contestId } = await resolveTarget(
    input.exerciseId,
    input.contestSlug ?? null,
  );
  const type = validateHandwrittenImage(input.file);

  // The key is random and unrelated to any user input; the file is only ever
  // served through an authorized route, never from a public path.
  const storageKey = `handwritten/${randomUUID()}.${type.ext}`;
  const storage = getStorage();
  await storage.put(storageKey, Buffer.from(input.file.bytes));

  let saved: Awaited<ReturnType<typeof saveHandwrittenImage>>;
  try {
    saved = await saveHandwrittenImage({
      userId,
      exerciseId: input.exerciseId,
      contestId,
      storageKey,
    });
  } catch (error) {
    await removeQuietly(storageKey);
    throw error;
  }
  // Only after the commit: a failed delete leaves an unreferenced file, never a broken submission.
  if (saved.replacedKey) await removeQuietly(saved.replacedKey);

  return {
    id: saved.id,
    submittedAt: saved.createdAt,
    replaced: saved.replacedKey !== null,
  };
}

async function removeQuietly(key: string) {
  try {
    await getStorage().delete(key);
  } catch (error) {
    logger.error("handwritten_image_delete_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * The image bytes of one handwritten submission, for its owner only. Someone
 * else's submission answers exactly like a missing one, so the response never
 * confirms that another learner's image exists.
 */
export async function readHandwrittenImage(submissionId: string) {
  const user = await requireRole([RoleName.STUDENT]);
  const row = await findSubmissionImage(submissionId);
  if (!row || row.userId !== user.id || !row.imageUrl) throw NOT_FOUND();
  const bytes = await getStorage().get(row.imageUrl);
  return { bytes, mime: mimeFromStorageKey(row.imageUrl) };
}

/** The learner's current upload for an exercise (practice mode), without any storage details. */
export async function getOwnHandwrittenUpload(
  userId: string,
  exerciseId: string,
) {
  const row = await findOwnUpload(userId, exerciseId, null);
  return row
    ? { id: row.id, status: row.status, submittedAt: row.createdAt }
    : null;
}

export type OwnHandwrittenUpload = NonNullable<
  Awaited<ReturnType<typeof getOwnHandwrittenUpload>>
>;
