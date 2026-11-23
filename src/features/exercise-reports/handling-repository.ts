import { Prisma, type ExerciseReportStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { REPORT_PAGE_SIZE, type reportUpdateSchema } from "./handling-rules";
import type { z } from "zod";

export const reportViewSelect = {
  id: true,
  kind: true,
  description: true,
  status: true,
  resolution: true,
  createdAt: true,
  resolvedAt: true,
  version: true,
  user: { select: { name: true } },
  exercise: { select: { id: true, title: true } },
  room: {
    select: {
      id: true,
      title: true,
      path: { select: { slug: true, title: true } },
    },
  },
} satisfies Prisma.ExerciseReportSelect;

export function ownedReportsWhere(
  userId: string,
  admin: boolean,
): Prisma.ExerciseReportWhereInput {
  return admin
    ? {}
    : {
        room: { path: { creatorId: userId } },
        exercise: { room: { path: { creatorId: userId } } },
      };
}

export async function listReportPage(
  where: Prisma.ExerciseReportWhereInput,
  page: number,
) {
  const [total, reports] = await db.$transaction([
    db.exerciseReport.count({ where }),
    db.exerciseReport.findMany({
      where,
      select: reportViewSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * REPORT_PAGE_SIZE,
      take: REPORT_PAGE_SIZE,
    }),
  ]);
  return {
    total,
    reports,
    page,
    pages: Math.max(1, Math.ceil(total / REPORT_PAGE_SIZE)),
  };
}

/** Lock report and its Path so ownership checks and resolution commit together. */
export function updateOwnedReport(
  actorId: string,
  admin: boolean,
  reportId: string,
  input: z.infer<typeof reportUpdateSchema>,
) {
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT r.id FROM "ExerciseReport" r
      JOIN "Room" room ON room.id = r."roomId"
      JOIN "Path" p ON p.id = room."pathId"
      JOIN "Exercise" e ON e.id = r."exerciseId"
      JOIN "Room" current_room ON current_room.id = e."roomId"
      JOIN "Path" current_path ON current_path.id = current_room."pathId"
      WHERE r.id = ${reportId} AND ((p."creatorId" = ${actorId} AND current_path."creatorId" = ${actorId}) OR ${admin})
      FOR UPDATE OF r, p, e, room, current_room, current_path`;
    if (!rows.length)
      throw new AppError(
        404,
        "REPORT_NOT_FOUND",
        "Không tìm thấy báo lỗi bạn được quản lý.",
      );
    const report = await tx.exerciseReport.findUniqueOrThrow({
      where: { id: reportId },
      select: {
        id: true,
        status: true,
        version: true,
        userId: true,
        exercise: { select: { title: true } },
      },
    });
    if (report.status === input.status) return { changed: false };
    if (report.status === "RESOLVED")
      throw new AppError(
        409,
        "REPORT_CLOSED",
        "Báo lỗi đã xử lý và không thể mở lại.",
      );
    if (report.version !== input.version)
      throw new AppError(
        409,
        "REPORT_CHANGED",
        "Báo lỗi vừa được cập nhật. Hãy tải lại trước khi xử lý.",
      );
    const resolved = input.status === "RESOLVED";
    await tx.exerciseReport.update({
      where: { id: reportId },
      data: {
        status: input.status,
        version: { increment: 1 },
        ...(resolved
          ? {
              resolution: input.resolution,
              resolvedAt: new Date(),
              handlerId: actorId,
            }
          : {}),
      },
    });
    if (resolved)
      await tx.notification.upsert({
        where: {
          userId_dedupeKey: {
            userId: report.userId,
            dedupeKey: `report-resolved:${reportId}`,
          },
        },
        create: {
          userId: report.userId,
          type: "REPORT_RESOLVED",
          title: `Báo lỗi đã xử lý: ${report.exercise.title}`,
          body: input.resolution,
          href: `/hv/reports?report=${reportId}#${reportId}`,
          dedupeKey: `report-resolved:${reportId}`,
        },
        update: {},
        select: { id: true },
      });
    return { changed: true };
  });
}

export function countReportNotifications(userId: string) {
  return db.notification.count({
    where: { userId, type: "REPORT_RESOLVED", readAt: null },
  });
}
export function readReportNotifications(userId: string) {
  return db.notification.updateMany({
    where: { userId, type: "REPORT_RESOLVED", readAt: null },
    data: { readAt: new Date() },
  });
}
export type ReportStatus = ExerciseReportStatus;
