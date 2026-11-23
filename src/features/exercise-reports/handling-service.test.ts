import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoleName } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  role: vi.fn(),
  list: vi.fn(),
  update: vi.fn(),
  count: vi.fn(),
  read: vi.fn(),
}));
vi.mock("@/features/auth/service", () => ({ requireRole: mocks.role }));
vi.mock("./handling-repository", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./handling-repository")>()),
  listReportPage: mocks.list,
  updateOwnedReport: mocks.update,
  countReportNotifications: mocks.count,
  readReportNotifications: mocks.read,
}));
import {
  changeReportStatus,
  getManagedReports,
  getMyReports,
  markMyReportNotificationsRead,
} from "./handling-service";
import { parseReportFilters } from "./handling-rules";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.role.mockResolvedValue({
    id: "teacher",
    role: { name: RoleName.TEACHER },
  });
  mocks.list.mockResolvedValue({ reports: [], total: 0, page: 1, pages: 1 });
  mocks.count.mockResolvedValue(0);
});

describe("teacher report handling", () => {
  it("restricts the query itself to reports on the teacher's Paths", async () => {
    await getManagedReports("NEW", "2");
    expect(mocks.role).toHaveBeenCalledWith([RoleName.TEACHER, RoleName.ADMIN]);
    expect(mocks.list).toHaveBeenCalledWith(
      {
        room: { path: { creatorId: "teacher" } },
        exercise: { room: { path: { creatorId: "teacher" } } },
        status: "NEW",
      },
      2,
    );
  });
  it("retains explicit admin-wide access", async () => {
    mocks.role.mockResolvedValue({
      id: "admin",
      role: { name: RoleName.ADMIN },
    });
    await getManagedReports(undefined, "1");
    expect(mocks.list).toHaveBeenCalledWith({}, 1);
  });
  it.each(["NEW", "IN_PROGRESS", "RESOLVED"])(
    "accepts %s and passes session identity, never supplied actor flags",
    async (status) => {
      await changeReportStatus("report", {
        status,
        version: 3,
        resolution: " Đã sửa test. ",
        actorId: "other",
        admin: true,
      });
      expect(mocks.update).toHaveBeenCalledWith("teacher", false, "report", {
        status,
        version: 3,
        resolution: "Đã sửa test.",
      });
    },
  );
  it.each([
    { status: "RESOLVED", version: 0, resolution: " " },
    { status: "BOGUS", version: 0, resolution: "x" },
    { status: "NEW", version: -1, resolution: "" },
    { status: "NEW", version: "1", resolution: "" },
    { status: "RESOLVED", version: 0, resolution: "x".repeat(2001) },
    null,
  ])("rejects malformed transitions before storage", async (body) => {
    await expect(changeReportStatus("report", body)).rejects.toMatchObject({
      status: 400,
    });
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("propagates missing ownership without writing", async () => {
    mocks.update.mockRejectedValue(
      Object.assign(new Error("no"), { status: 404 }),
    );
    await expect(
      changeReportStatus("foreign", { status: "IN_PROGRESS", version: 0 }),
    ).rejects.toMatchObject({ status: 404 });
  });
  it.each([
    getManagedReports,
    () => changeReportStatus("report", { status: "NEW", version: 0 }),
    getMyReports,
    markMyReportNotificationsRead,
  ])("denies missing auth/live role before querying", async (operation) => {
    mocks.role.mockRejectedValue(new Error("Denied"));
    await expect(operation(undefined, undefined)).rejects.toThrow("Denied");
    expect(mocks.list).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.read).not.toHaveBeenCalled();
  });
});

describe("learner report updates", () => {
  it("filters every page and specific report link to the signed-in learner", async () => {
    mocks.role.mockResolvedValue({
      id: "learner",
      role: { name: RoleName.STUDENT },
    });
    await getMyReports("10", "foreign-report");
    expect(mocks.role).toHaveBeenCalledWith([RoleName.STUDENT]);
    expect(mocks.list).toHaveBeenCalledWith(
      { userId: "learner", id: "foreign-report" },
      1,
    );
    expect(mocks.count).toHaveBeenCalledWith("learner");
  });
  it("marks only the session user's report notifications read", async () => {
    mocks.role.mockResolvedValue({
      id: "learner",
      role: { name: RoleName.STUDENT },
    });
    await markMyReportNotificationsRead();
    expect(mocks.read).toHaveBeenCalledWith("learner");
  });
  it.each(["-1", "Infinity", "1.5", "1001", ["1"]])(
    "bounds invalid pagination %j",
    (page) => {
      expect(parseReportFilters("BOGUS", page)).toEqual({
        status: undefined,
        page: 1,
      });
    },
  );
});
