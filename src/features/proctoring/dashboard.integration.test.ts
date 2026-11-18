import { randomUUID } from "node:crypto";
import {
  ContestStatus,
  ProctoringEventType,
  RoleName,
  Prisma,
} from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { canConnectToDatabase } from "@/test-utils/database";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
}));

vi.mock("@/features/auth/service", () => ({
  requireRole: mocks.requireRole,
}));

import { getContestViolationDashboard } from "./dashboard";

const hasDatabase = await canConnectToDatabase();
const prefix = `it-proc-dash-${randomUUID()}`;

describe.skipIf(!hasDatabase)(
  "contest violation dashboard (PostgreSQL integration)",
  () => {
    const userIds: string[] = [];
    const contestIds: string[] = [];
    let ownerTeacher = { id: "", role: { name: RoleName.TEACHER } };
    let otherTeacher = { id: "", role: { name: RoleName.TEACHER } };
    let adminUser = { id: "", role: { name: RoleName.ADMIN } };
    let studentFlaggedId = "";
    let studentNormalId = "";
    let contestId = "";
    let contestSlug = "";
    let orphanContestSlug = "";
    let otherContestSlug = "";

    beforeAll(async () => {
      const [teacherRole, adminRole, studentRole] = await Promise.all([
        db.role.upsert({
          where: { name: RoleName.TEACHER },
          update: {},
          create: { name: RoleName.TEACHER },
        }),
        db.role.upsert({
          where: { name: RoleName.ADMIN },
          update: {},
          create: { name: RoleName.ADMIN },
        }),
        db.role.upsert({
          where: { name: RoleName.STUDENT },
          update: {},
          create: { name: RoleName.STUDENT },
        }),
      ]);

      const [t1, t2, admin, s1, s2, sOther] = await Promise.all([
        db.user.create({
          data: {
            email: `${prefix}-t1@local.test`,
            name: "Owner Teacher",
            passwordHash: "unused",
            roleId: teacherRole.id,
          },
        }),
        db.user.create({
          data: {
            email: `${prefix}-t2@local.test`,
            name: "Other Teacher",
            passwordHash: "unused",
            roleId: teacherRole.id,
          },
        }),
        db.user.create({
          data: {
            email: `${prefix}-admin@local.test`,
            name: "Admin Reviewer",
            passwordHash: "unused",
            roleId: adminRole.id,
          },
        }),
        db.user.create({
          data: {
            email: `${prefix}-s1@local.test`,
            name: "Trần Minh Anh",
            passwordHash: "unused",
            roleId: studentRole.id,
          },
        }),
        db.user.create({
          data: {
            email: `${prefix}-s2@local.test`,
            name: "Lê Quốc Bảo",
            passwordHash: "unused",
            roleId: studentRole.id,
          },
        }),
        db.user.create({
          data: {
            email: `${prefix}-s3@local.test`,
            name: "Khách Khác Cuộc Thi",
            passwordHash: "unused",
            roleId: studentRole.id,
          },
        }),
      ]);

      ownerTeacher = { id: t1.id, role: { name: RoleName.TEACHER } };
      otherTeacher = { id: t2.id, role: { name: RoleName.TEACHER } };
      adminUser = { id: admin.id, role: { name: RoleName.ADMIN } };
      studentFlaggedId = s1.id;
      studentNormalId = s2.id;
      userIds.push(t1.id, t2.id, admin.id, s1.id, s2.id, sOther.id);

      const flaggedTime = new Date("2026-11-18T05:10:00.000Z");
      const contest = await db.contest.create({
        data: {
          slug: `${prefix}-main`,
          title: "Contest Proctoring Dashboard",
          status: ContestStatus.PUBLISHED,
          creatorId: ownerTeacher.id,
          violationThreshold: 2,
          participants: {
            create: [
              {
                userId: studentFlaggedId,
                violationCount: 3,
                flaggedAt: flaggedTime,
                startedAt: new Date("2026-11-18T05:00:00.000Z"),
                deadlineAt: new Date("2026-11-18T06:00:00.000Z"),
              },
              {
                userId: studentNormalId,
                violationCount: 1,
                flaggedAt: null,
                startedAt: new Date("2026-11-18T05:00:00.000Z"),
                deadlineAt: new Date("2026-11-18T07:00:00.000Z"),
              },
            ],
          },
        },
      });
      contestId = contest.id;
      contestSlug = contest.slug;
      contestIds.push(contest.id);

      const orphanContest = await db.contest.create({
        data: {
          slug: `${prefix}-orphan`,
          title: "Orphan Empty Contest",
          status: ContestStatus.PUBLISHED,
          creatorId: null,
        },
      });
      orphanContestSlug = orphanContest.slug;
      contestIds.push(orphanContest.id);

      const otherContest = await db.contest.create({
        data: {
          slug: `${prefix}-other`,
          title: "Foreign Contest",
          status: ContestStatus.PUBLISHED,
          creatorId: otherTeacher.id,
          participants: {
            create: [
              { userId: sOther.id, violationCount: 5, flaggedAt: flaggedTime },
            ],
          },
        },
      });
      otherContestSlug = otherContest.slug;
      contestIds.push(otherContest.id);

      const sameTimestamp = new Date("2026-11-18T05:08:00.000Z");
      await db.proctoringEvent.createMany({
        data: [
          {
            id: `${prefix}-evt-1`,
            contestId,
            userId: studentFlaggedId,
            type: ProctoringEventType.TAB_SWITCH,
            metadata: Prisma.DbNull,
            createdAt: new Date("2026-11-18T05:05:00.000Z"),
          },
          {
            id: `${prefix}-evt-2`,
            contestId,
            userId: studentFlaggedId,
            type: ProctoringEventType.PASTE,
            metadata: { pasteLength: 180 },
            createdAt: sameTimestamp,
          },
          {
            id: `${prefix}-evt-3`,
            contestId,
            userId: studentFlaggedId,
            type: ProctoringEventType.FULLSCREEN_EXIT,
            metadata: "corrupted-metadata-format",
            createdAt: sameTimestamp,
          },
          {
            id: `${prefix}-evt-4`,
            contestId,
            userId: studentNormalId,
            type: ProctoringEventType.PASTE,
            metadata: { pasteLength: 15 },
            createdAt: new Date("2026-11-18T05:09:00.000Z"),
          },
          // Foreign contest event must never bleed into contestId dashboard
          {
            id: `${prefix}-evt-foreign`,
            contestId: otherContest.id,
            userId: sOther.id,
            type: ProctoringEventType.TAB_SWITCH,
            metadata: { pasteLength: 999 },
            createdAt: new Date("2026-11-18T05:12:00.000Z"),
          },
        ],
      });
    });

    afterAll(async () => {
      if (contestIds.length > 0) {
        await db.contest.deleteMany({ where: { id: { in: contestIds } } });
      }
      if (userIds.length > 0) {
        await db.user.deleteMany({ where: { id: { in: userIds } } });
      }
      await db.$disconnect();
    });

    it("enforces owner/ADMIN authorization including ownerless contests", async () => {
      mocks.requireRole.mockResolvedValue(ownerTeacher);
      await expect(
        getContestViolationDashboard(contestSlug),
      ).resolves.toMatchObject({ contest: { id: contestId } });
      await expect(
        getContestViolationDashboard(otherContestSlug),
      ).rejects.toMatchObject({ status: 403 });
      await expect(
        getContestViolationDashboard(orphanContestSlug),
      ).rejects.toMatchObject({ status: 403 });

      mocks.requireRole.mockResolvedValue(otherTeacher);
      await expect(
        getContestViolationDashboard(contestSlug),
      ).rejects.toMatchObject({ status: 403 });

      mocks.requireRole.mockResolvedValue(adminUser);
      await expect(
        getContestViolationDashboard(contestSlug),
      ).resolves.toMatchObject({ contest: { id: contestId } });
      const orphanView = await getContestViolationDashboard(orphanContestSlug);
      expect(orphanView.overview.totalParticipants).toBe(0);
      expect(orphanView.overview.totalEvents).toBe(0);
      expect(orphanView.participants).toEqual([]);
      expect(orphanView.timeline.items).toEqual([]);
    });

    it("filters by flaggedAt, eventType, participant, name search, isolates contests, and paginates deterministically without duplicates", async () => {
      mocks.requireRole.mockResolvedValue(ownerTeacher);

      // Full view checks KPIs, sorting, and cross-contest isolation
      const full = await getContestViolationDashboard(contestSlug);
      expect(full.overview).toMatchObject({
        totalParticipants: 2,
        flaggedParticipants: 1,
        totalEvents: 4,
      });
      expect(full.participants.map((p) => p.userId)).toEqual([
        studentFlaggedId,
        studentNormalId,
      ]);
      expect(full.timeline.items.map((item) => item.id)).toEqual([
        `${prefix}-evt-4`,
        `${prefix}-evt-3`,
        `${prefix}-evt-2`,
        `${prefix}-evt-1`,
      ]);
      expect(
        full.timeline.items.some((item) => item.id === `${prefix}-evt-foreign`),
      ).toBe(false);
      // Malformed metadata safely yields null summary
      expect(
        full.timeline.items.find((item) => item.id === `${prefix}-evt-3`)
          ?.metadata.summary,
      ).toBeNull();

      // Keyset cursor pagination (limit=2) collects all 4 events in exact order with 0 duplicates/skips
      const page1 = await getContestViolationDashboard(contestSlug, {
        limit: 2,
      });
      expect(page1.timeline.items.map((item) => item.id)).toEqual([
        `${prefix}-evt-4`,
        `${prefix}-evt-3`,
      ]);
      expect(page1.timeline.hasMore).toBe(true);

      const page2 = await getContestViolationDashboard(contestSlug, {
        limit: 2,
        cursor: page1.timeline.nextCursor ?? undefined,
      });
      expect(page2.timeline.items.map((item) => item.id)).toEqual([
        `${prefix}-evt-2`,
        `${prefix}-evt-1`,
      ]);
      expect(page2.timeline.hasMore).toBe(false);

      // Filter: flaggedOnly + eventType
      const flaggedPaste = await getContestViolationDashboard(contestSlug, {
        flagged: "1",
        type: "PASTE",
      });
      expect(flaggedPaste.participants.map((p) => p.userId)).toEqual([
        studentFlaggedId,
      ]);
      expect(flaggedPaste.timeline.items.map((item) => item.id)).toEqual([
        `${prefix}-evt-2`,
      ]);

      // Filter: participant isolation + empty filter state
      const byParticipant = await getContestViolationDashboard(contestSlug, {
        participant: studentFlaggedId,
        q: "Minh Anh",
      });
      expect(byParticipant.selectedParticipant?.userId).toBe(studentFlaggedId);
      expect(byParticipant.timeline.items).toHaveLength(3);

      const noMatch = await getContestViolationDashboard(contestSlug, {
        q: "KhongTonTai",
      });
      expect(noMatch.participants).toEqual([]);
      expect(noMatch.timeline.items).toEqual([]);
    });
  },
);
