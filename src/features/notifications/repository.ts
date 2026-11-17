import { ContestStatus, NotificationType } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import {
  DEFAULT_NOTIFICATION_LIMIT,
  MAX_NOTIFICATION_LIMIT,
  type CreateNotificationInput,
} from "./types";

const CREATE_BATCH_SIZE = 500;

function toPrismaType(type: CreateNotificationInput["type"]): NotificationType {
  return type as NotificationType;
}

export async function createNotifications(
  inputs: readonly CreateNotificationInput[],
): Promise<number> {
  if (inputs.length === 0) return 0;

  const seenDedupe = new Set<string>();
  const rows: Array<{
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    href: string | null;
    dedupeKey: string | null;
  }> = [];

  for (const item of inputs) {
    const userId = item.userId.trim();
    if (!userId) continue;

    const dedupeKey = item.dedupeKey?.trim() || null;
    if (dedupeKey) {
      const compositeKey = `${userId}\0${dedupeKey}`;
      if (seenDedupe.has(compositeKey)) continue;
      seenDedupe.add(compositeKey);
    }

    rows.push({
      userId,
      type: toPrismaType(item.type),
      title: item.title,
      body: item.body,
      href: item.href ?? null,
      dedupeKey,
    });
  }

  if (rows.length === 0) return 0;

  let createdCount = 0;
  for (let offset = 0; offset < rows.length; offset += CREATE_BATCH_SIZE) {
    const batch = rows.slice(offset, offset + CREATE_BATCH_SIZE);
    const result = await db.notification.createMany({
      data: batch,
      skipDuplicates: true,
    });
    createdCount += result.count;
  }

  return createdCount;
}

export function createNotification(
  input: CreateNotificationInput,
): Promise<number> {
  return createNotifications([input]);
}

export function listUserNotifications(
  userId: string,
  limit = DEFAULT_NOTIFICATION_LIMIT,
) {
  const safeLimit = Math.min(Math.max(1, limit), MAX_NOTIFICATION_LIMIT);
  return db.notification.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: safeLimit,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      href: true,
      readAt: true,
      createdAt: true,
    },
  });
}

export function countUnreadNotifications(userId: string) {
  return db.notification.count({
    where: { userId, readAt: null },
  });
}

export async function markNotificationAsRead(
  userId: string,
  notificationId: string,
  readAt = new Date(),
): Promise<{ id: string; readAt: Date }> {
  const updated = await db.notification.updateMany({
    where: { id: notificationId, userId, readAt: null },
    data: { readAt },
  });

  if (updated.count > 0) {
    return { id: notificationId, readAt };
  }

  // Only inspect rows owned by the caller so foreign IDs always return 404.
  const existing = await db.notification.findFirst({
    where: { id: notificationId, userId },
    select: { id: true, readAt: true },
  });

  if (!existing) {
    throw new AppError(
      404,
      "NOTIFICATION_NOT_FOUND",
      "Không tìm thấy thông báo.",
    );
  }

  return { id: existing.id, readAt: existing.readAt ?? readAt };
}

export async function markAllNotificationsAsRead(
  userId: string,
  readAt = new Date(),
): Promise<{ updatedCount: number }> {
  const result = await db.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt },
  });
  return { updatedCount: result.count };
}

export async function findEnrolledLearnerIdsForPath(
  pathId: string,
  excludeUserId?: string,
): Promise<string[]> {
  const rows = await db.enrollment.findMany({
    where: {
      pathId,
      ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
    },
    select: { userId: true },
  });
  return rows.map((row) => row.userId);
}

export async function findContestSubmissionNotificationContext(
  contestId: string,
  exerciseId: string,
) {
  const [contest, exercise] = await Promise.all([
    db.contest.findUnique({
      where: { id: contestId },
      select: { id: true, slug: true, title: true },
    }),
    db.exercise.findUnique({
      where: { id: exerciseId },
      select: { id: true, title: true },
    }),
  ]);
  return { contest, exercise };
}

export function findUpcomingContestsForReminders(now: Date, windowEnd: Date) {
  return db.contest.findMany({
    where: {
      status: ContestStatus.PUBLISHED,
      examStartsAt: { gt: now, lte: windowEnd },
      OR: [{ examEndsAt: null }, { examEndsAt: { gt: now } }],
    },
    select: {
      id: true,
      slug: true,
      title: true,
      examStartsAt: true,
      examEndsAt: true,
      participants: {
        select: { userId: true },
      },
    },
  });
}
