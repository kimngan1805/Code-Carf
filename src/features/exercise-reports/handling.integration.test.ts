import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { canConnectToDatabase } from "@/test-utils/database";
import {
  listReportPage,
  ownedReportsWhere,
  readReportNotifications,
  updateOwnedReport,
} from "./handling-repository";

const hasDatabase = await canConnectToDatabase();
describe.skipIf(!hasDatabase)(
  "report ownership, resolution and atomic notifications (PostgreSQL)",
  () => {
    const users: string[] = [],
      paths: string[] = [];
    let teacher: string,
      otherTeacher: string,
      learner: string,
      otherLearner: string,
      reportId: string;
    beforeAll(async () => {
      const prefix = randomUUID();
      for (const [index, name] of [
        "TEACHER",
        "TEACHER",
        "STUDENT",
        "STUDENT",
      ].entries()) {
        const role = await db.role.upsert({
          where: { name: name as "TEACHER" | "STUDENT" },
          create: { name: name as "TEACHER" | "STUDENT" },
          update: {},
        });
        users.push(
          (
            await db.user.create({
              data: {
                name: "Report handling check",
                email: `handle-${index}-${prefix}@local.test`,
                passwordHash: "no-login",
                roleId: role.id,
              },
            })
          ).id,
        );
      }
      [teacher, otherTeacher, learner, otherLearner] = users;
      for (const [index, creatorId] of [teacher, otherTeacher].entries()) {
        const path = await db.path.create({
          data: {
            creatorId,
            slug: `handle-${index}-${prefix}`,
            title: "Ownership check",
            rooms: {
              create: {
                title: "Room",
                position: 1,
                exercises: {
                  create: { title: "Exercise", prompt: "PRIVATE_PROMPT" },
                },
              },
            },
          },
          include: { rooms: { include: { exercises: true } } },
        });
        paths.push(path.id);
        const report = await db.exerciseReport.create({
          data: {
            userId: learner,
            roomId: path.rooms[0].id,
            exerciseId: path.rooms[0].exercises[0].id,
            kind: "STATEMENT",
            description: `Private report ${index}`,
          },
        });
        if (index === 0) reportId = report.id;
      }
    });
    afterAll(async () => {
      await db.exercise.deleteMany({
        where: { room: { pathId: { in: paths } } },
      });
      await db.path.deleteMany({ where: { id: { in: paths } } });
      await db.user.deleteMany({ where: { id: { in: users } } });
    });
    it("filters records and total count at database level; excludes reporter secrets", async () => {
      const data = await listReportPage(ownedReportsWhere(teacher, false), 1);
      expect(data.total).toBe(1);
      expect(data.reports.map((row) => row.id)).toEqual([reportId]);
      expect(JSON.stringify(data)).not.toContain("passwordHash");
      expect(JSON.stringify(data)).not.toContain("@local.test");
      expect(JSON.stringify(data)).not.toContain("PRIVATE_PROMPT");
      expect((await listReportPage({ userId: otherLearner }, 1)).total).toBe(0);
    });
    it("hides reports if their exercise moves into another teacher's private content", async () => {
      const report = await db.exerciseReport.findUniqueOrThrow({
        where: { id: reportId },
      });
      const foreignRoom = await db.room.findFirstOrThrow({
        where: { pathId: paths[1] },
      });
      await db.exercise.update({
        where: { id: report.exerciseId },
        data: { roomId: foreignRoom.id },
      });
      try {
        expect(
          (await listReportPage(ownedReportsWhere(teacher, false), 1)).total,
        ).toBe(0);
        await expect(
          updateOwnedReport(teacher, false, reportId, {
            status: "IN_PROGRESS",
            version: 0,
            resolution: "",
          }),
        ).rejects.toMatchObject({ status: 404 });
      } finally {
        await db.exercise.update({
          where: { id: report.exerciseId },
          data: { roomId: report.roomId },
        });
      }
    });
    it("rejects another teacher even when a real report ID is known", async () => {
      await expect(
        updateOwnedReport(otherTeacher, false, reportId, {
          status: "RESOLVED",
          version: 0,
          resolution: "Fake",
        }),
      ).rejects.toMatchObject({ status: 404 });
      expect(
        (await db.exerciseReport.findUniqueOrThrow({ where: { id: reportId } }))
          .status,
      ).toBe("NEW");
      expect(await db.notification.count({ where: { userId: learner } })).toBe(
        0,
      );
    });
    it("updates progress without notification and rejects a stale overwrite", async () => {
      await updateOwnedReport(teacher, false, reportId, {
        status: "IN_PROGRESS",
        version: 0,
        resolution: "",
      });
      await expect(
        updateOwnedReport(teacher, false, reportId, {
          status: "NEW",
          version: 0,
          resolution: "",
        }),
      ).rejects.toMatchObject({ code: "REPORT_CHANGED" });
      expect(await db.notification.count({ where: { userId: learner } })).toBe(
        0,
      );
    });
    it("commits resolution and exactly one notification under concurrent requests", async () => {
      await Promise.all(
        Array.from({ length: 4 }, () =>
          updateOwnedReport(teacher, false, reportId, {
            status: "RESOLVED",
            version: 1,
            resolution: "Đã sửa test case.",
          }),
        ),
      );
      const report = await db.exerciseReport.findUniqueOrThrow({
        where: { id: reportId },
      });
      expect(report).toMatchObject({
        status: "RESOLVED",
        handlerId: teacher,
        version: 2,
        resolution: "Đã sửa test case.",
      });
      expect(report.resolvedAt).toBeInstanceOf(Date);
      const notes = await db.notification.findMany({
        where: { dedupeKey: `report-resolved:${reportId}` },
      });
      expect(notes).toHaveLength(1);
      expect(notes[0]).toMatchObject({
        userId: learner,
        type: "REPORT_RESOLVED",
        readAt: null,
        body: "Đã sửa test case.",
      });
      expect(notes[0].href).toContain(`report=${reportId}`);
      await expect(
        updateOwnedReport(teacher, false, reportId, {
          status: "NEW",
          version: 2,
          resolution: "",
        }),
      ).rejects.toMatchObject({ code: "REPORT_CLOSED" });
    });
    it("only marks the actual recipient's report notifications read", async () => {
      await readReportNotifications(otherLearner);
      expect(
        (
          await db.notification.findFirstOrThrow({
            where: { dedupeKey: `report-resolved:${reportId}` },
          })
        ).readAt,
      ).toBeNull();
      await readReportNotifications(learner);
      expect(
        (
          await db.notification.findFirstOrThrow({
            where: { dedupeKey: `report-resolved:${reportId}` },
          })
        ).readAt,
      ).toBeInstanceOf(Date);
    });
    it("paginates and filters without including another owner's reports in the count", async () => {
      const source = await db.exerciseReport.findUniqueOrThrow({
        where: { id: reportId },
      });
      await db.exerciseReport.createMany({
        data: Array.from({ length: 25 }, (_, index) => ({
          userId: learner,
          roomId: source.roomId,
          exerciseId: source.exerciseId,
          kind: "STATEMENT" as const,
          description: `Pagination report ${index}`,
        })),
      });
      const second = await listReportPage(ownedReportsWhere(teacher, false), 2);
      expect(second.total).toBe(26);
      expect(second.reports).toHaveLength(6);
      expect(second.pages).toBe(2);
      const fresh = await listReportPage(
        { ...ownedReportsWhere(teacher, false), status: "NEW" },
        1,
      );
      expect(fresh.total).toBe(25);
      expect(fresh.reports.every((item) => item.status === "NEW")).toBe(true);
    });
  },
);
