import {
  ExerciseKind,
  Prisma,
  RoleName,
  SubmissionStatus,
} from "@prisma/client";
import { z } from "zod";
import { requireRole } from "@/features/auth/service";
import { notifyHandwrittenGraded } from "@/features/notifications/writer";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

/**
 * Giảng viên chấm tay bài tự luận luyện tập (học viên nộp ảnh). Bài trong cuộc thi
 * do admin/giám khảo xử lý nên không nằm ở đây.
 *
 * Điểm lưu theo phần trăm (0-100) như bài code; giao diện nhập và hiện thang 10.
 * Từ 5/10 trở lên là Đạt. Đã chấm thì học viên không nộp lại ảnh được (luật có sẵn),
 * nhưng giảng viên vẫn chấm lại được.
 */
export const PASS_SCORE = 50;
export const REVIEW_PAGE_SIZE = 20;

export type ReviewFilter = "pending" | "graded";

const PENDING_STATUSES = [
  SubmissionStatus.PENDING,
  SubmissionStatus.RUNNING,
  SubmissionStatus.NEEDS_REVIEW,
];

type Reviewer = Awaited<ReturnType<typeof requireReviewer>>;

function requireReviewer() {
  return requireRole([RoleName.TEACHER, RoleName.ADMIN]);
}

/** Bài tự luận luyện tập trong lộ trình (còn hoạt động) mà người này quản lý. */
export function reviewScope(user: Reviewer): Prisma.SubmissionWhereInput {
  return {
    contestId: null,
    imageUrl: { not: null },
    exercise: {
      kind: ExerciseKind.HANDWRITTEN,
      room: {
        path: {
          deletedAt: null,
          ...(user.role.name === RoleName.ADMIN ? {} : { creatorId: user.id }),
        },
      },
    },
  };
}

function filterWhere(filter: ReviewFilter): Prisma.SubmissionWhereInput {
  return filter === "pending"
    ? { status: { in: PENDING_STATUSES } }
    : { status: { notIn: PENDING_STATUSES } };
}

export async function listHandwrittenReviews(input: {
  filter?: string;
  page?: string;
}) {
  const user = await requireReviewer();
  const filter: ReviewFilter = input.filter === "graded" ? "graded" : "pending";
  const scope = reviewScope(user);
  const where = { AND: [scope, filterWhere(filter)] };
  const [pendingCount, total] = await Promise.all([
    db.submission.count({ where: { AND: [scope, filterWhere("pending")] } }),
    db.submission.count({ where }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / REVIEW_PAGE_SIZE));
  const page = Math.min(
    Math.max(1, Number.parseInt(input.page ?? "1", 10) || 1),
    totalPages,
  );
  const rows = await db.submission.findMany({
    where,
    // Chờ chấm: bài nộp trước chấm trước. Đã chấm: mới chấm lên đầu.
    orderBy:
      filter === "pending"
        ? [{ createdAt: "asc" }, { id: "asc" }]
        : [{ reviewedAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * REVIEW_PAGE_SIZE,
    take: REVIEW_PAGE_SIZE,
    select: {
      id: true,
      status: true,
      score: true,
      createdAt: true,
      reviewedAt: true,
      user: { select: { name: true } },
      exercise: {
        select: {
          title: true,
          room: {
            select: { title: true, path: { select: { title: true } } },
          },
        },
      },
    },
  });
  return {
    filter,
    page,
    totalPages,
    total,
    pendingCount,
    items: rows.map((row) => ({
      id: row.id,
      status: row.status,
      score: row.score,
      submittedAt: row.createdAt,
      reviewedAt: row.reviewedAt,
      learner: row.user.name,
      exercise: row.exercise.title,
      lesson: row.exercise.room?.title ?? "",
      path: row.exercise.room?.path.title ?? "",
    })),
  };
}

const NOT_FOUND = () =>
  new AppError(404, "SUBMISSION_NOT_FOUND", "Không tìm thấy bài cần chấm.");

export async function getHandwrittenReview(submissionId: string) {
  const user = await requireReviewer();
  const scope = reviewScope(user);
  const row = await db.submission.findFirst({
    where: { AND: [scope, { id: submissionId }] },
    select: {
      id: true,
      status: true,
      score: true,
      feedback: true,
      createdAt: true,
      reviewedAt: true,
      user: { select: { name: true } },
      reviewer: { select: { name: true } },
      exercise: {
        select: {
          id: true,
          title: true,
          prompt: true,
          rubric: true,
          points: true,
          room: {
            select: {
              id: true,
              title: true,
              path: { select: { title: true, slug: true } },
            },
          },
        },
      },
    },
  });
  if (!row) throw NOT_FOUND();
  // Bài chờ chấm kế tiếp, để chấm liên tục không phải quay lại danh sách.
  const next = await db.submission.findFirst({
    where: {
      AND: [scope, filterWhere("pending"), { id: { not: row.id } }],
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  return {
    id: row.id,
    status: row.status,
    graded: row.reviewedAt !== null,
    score: row.score,
    feedback: row.feedback ?? "",
    submittedAt: row.createdAt,
    reviewedAt: row.reviewedAt,
    reviewer: row.reviewer?.name ?? null,
    learner: row.user.name,
    exercise: {
      id: row.exercise.id,
      title: row.exercise.title,
      prompt: row.exercise.prompt,
      rubric: row.exercise.rubric ?? "",
      points: row.exercise.points,
    },
    lesson: row.exercise.room
      ? {
          id: row.exercise.room.id,
          title: row.exercise.room.title,
          pathTitle: row.exercise.room.path.title,
          pathSlug: row.exercise.room.path.slug,
        }
      : null,
    nextId: next?.id ?? null,
  };
}

export const gradeSchema = z
  .object({
    submissionId: z.string().min(1).max(200),
    /** Thời điểm nộp ảnh giảng viên đã xem; học viên nộp ảnh khác thì từ chối lưu. */
    submittedAt: z.iso.datetime(),
    /** Thang 10, bước 0,5: lưu thành phần trăm nguyên (8,5 → 85) nên không lệch khi hiện lại. */
    score: z
      .number({ error: "Hãy nhập điểm từ 0 đến 10." })
      .min(0, "Điểm thấp nhất là 0.")
      .max(10, "Điểm cao nhất là 10.")
      .refine(
        (value) => Number.isInteger(value * 2),
        "Điểm lẻ theo bước 0,5 (ví dụ 7 hoặc 7,5).",
      ),
    feedback: z
      .string()
      .trim()
      .max(2000, "Nhận xét tối đa 2.000 ký tự.")
      .default(""),
  })
  .strict();

export async function gradeHandwrittenSubmission(body: unknown) {
  const user = await requireReviewer();
  const parsed = gradeSchema.safeParse(body);
  if (!parsed.success)
    throw new AppError(
      400,
      "INVALID_GRADE",
      parsed.error.issues[0]?.message ?? "Điểm chấm không hợp lệ.",
    );
  const input = parsed.data;
  const scope = reviewScope(user);
  const submittedAt = new Date(input.submittedAt);
  const score = Math.round(input.score * 10);
  const reviewedAt = new Date();

  // Chỉ ghi khi đúng ảnh giảng viên đã xem (createdAt đổi khi học viên nộp ảnh mới).
  const updated = await db.submission.updateMany({
    where: { AND: [scope, { id: input.submissionId, createdAt: submittedAt }] },
    data: {
      score,
      feedback: input.feedback || null,
      status:
        score >= PASS_SCORE
          ? SubmissionStatus.ACCEPTED
          : SubmissionStatus.REJECTED,
      reviewerId: user.id,
      reviewedAt,
    },
  });
  if (!updated.count) {
    const current = await db.submission.findFirst({
      where: { AND: [scope, { id: input.submissionId }] },
      select: { id: true },
    });
    if (!current) throw NOT_FOUND();
    throw new AppError(
      409,
      "SUBMISSION_REPLACED",
      "Học viên vừa nộp ảnh mới. Tải lại trang để chấm ảnh mới nhất.",
    );
  }

  const row = await db.submission.findUniqueOrThrow({
    where: { id: input.submissionId },
    select: {
      userId: true,
      exercise: { select: { id: true, title: true } },
    },
  });
  await notifyHandwrittenGraded({
    userId: row.userId,
    submissionId: input.submissionId,
    submittedAt,
    exerciseId: row.exercise.id,
    exerciseTitle: row.exercise.title,
    score10: input.score,
  });
  return { id: input.submissionId, score, reviewedAt };
}

/** Số bài chờ chấm, cho huy hiệu trên menu. */
export async function countPendingReviews() {
  const user = await requireReviewer();
  return db.submission.count({
    where: { AND: [reviewScope(user), filterWhere("pending")] },
  });
}
