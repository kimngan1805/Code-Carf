import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";
const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  read: vi.fn(),
  revalidate: vi.fn(),
  log: vi.fn(),
}));
vi.mock("./handling-service", () => ({
  changeReportStatus: mocks.update,
  markMyReportNotificationsRead: mocks.read,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/logger", () => ({ logger: { error: mocks.log } }));
import {
  changeReportAction,
  markReportNotificationsReadAction,
} from "./handling-actions";
function form(version = "1") {
  const data = new FormData();
  data.set("status", "RESOLVED");
  data.set("resolution", "Đã sửa.");
  data.set("version", version);
  data.set("admin", "true");
  data.set("actorId", "other");
  return data;
}
beforeEach(() => vi.resetAllMocks());
describe("report handling actions", () => {
  it("passes only allowed fields and invalidates both role pages", async () => {
    expect(await changeReportAction("report", {}, form())).toMatchObject({
      ok: true,
    });
    expect(mocks.update).toHaveBeenCalledWith("report", {
      status: "RESOLVED",
      resolution: "Đã sửa.",
      version: 1,
    });
    expect(mocks.revalidate.mock.calls.map((call) => call[0])).toEqual([
      "/gv/reports",
      "/hv/reports",
    ]);
  });
  it.each(["-1", "NaN", "1.5", ""])(
    "does not coerce malformed version %j into zero",
    async (version) => {
      await changeReportAction("report", {}, form(version));
      expect(mocks.update.mock.calls[0][1].version).toBe(-1);
    },
  );
  it.each([404, 409])(
    "preserves expected error messages (%s)",
    async (status) => {
      mocks.update.mockRejectedValue(
        new AppError(status, "EXPECTED", "Reload"),
      );
      expect(await changeReportAction("report", {}, form())).toEqual({
        ok: false,
        message: "Reload",
      });
      expect(mocks.revalidate).not.toHaveBeenCalled();
    },
  );
  it("hides unexpected failure details", async () => {
    mocks.update.mockRejectedValue(new Error("DB_SECRET"));
    expect(
      JSON.stringify(await changeReportAction("report", {}, form())),
    ).not.toContain("DB_SECRET");
    expect(mocks.log).toHaveBeenCalledOnce();
  });
  it("does not accept a user identity for marking messages read", async () => {
    await markReportNotificationsReadAction();
    expect(mocks.read).toHaveBeenCalledWith();
    expect(mocks.revalidate).toHaveBeenCalledWith("/hv/reports");
  });
});
