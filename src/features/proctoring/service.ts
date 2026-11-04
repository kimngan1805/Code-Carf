import { requireRole } from "@/features/auth/service";
import { AppError } from "@/lib/errors";
import { proctoringEventSchema } from "./schema";
import { recordProctoringEvent } from "./repository";
import { db } from "@/lib/db";
import { violationStatus } from "./rules";

export async function reportContestEvent(slug: string, body: unknown) {
  const user = await requireRole(["STUDENT"]);
  const parsed = proctoringEventSchema.safeParse(body);
  if (!parsed.success)
    throw new AppError(
      400,
      "INVALID_PROCTORING_EVENT",
      "Sự kiện không hợp lệ.",
    );
  return recordProctoringEvent(slug, user.id, parsed.data);
}

export async function getOwnViolationStatus(slug: string) {
  const user = await requireRole(["STUDENT"]);
  const contest = await db.contest.findUnique({
    where: { slug },
    select: { id: true, status: true, violationThreshold: true },
  });
  if (!contest || contest.status !== "PUBLISHED")
    throw new AppError(404, "CONTEST_NOT_FOUND", "Không tìm thấy cuộc thi.");
  const participant = await db.contestParticipant.findUnique({
    where: { contestId_userId: { contestId: contest.id, userId: user.id } },
    select: { violationCount: true, flaggedAt: true },
  });
  if (!participant)
    throw new AppError(403, "NOT_REGISTERED", "Bạn chưa đăng ký cuộc thi.");
  return violationStatus(
    participant.violationCount,
    contest.violationThreshold,
    participant.flaggedAt,
  );
}
