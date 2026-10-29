import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  decideApplication: vi.fn(),
  findDocument: vi.fn(),
  send: vi.fn(),
  get: vi.fn(),
}));
vi.mock("@/features/auth/service", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/lib/mailer", () => ({ getMailer: () => ({ send: mocks.send }) }));
vi.mock("@/lib/storage", () => ({ getStorage: () => ({ get: mocks.get }) }));
vi.mock("./repository", () => ({
  decideApplication: mocks.decideApplication,
  findDocument: mocks.findDocument,
  countApplicationsByStatus: vi.fn(),
  createApplication: vi.fn(),
  findApplicationDetail: vi.fn(),
  findOpenApplication: vi.fn(),
  findSchool: vi.fn(),
  listApplications: vi.fn(),
}));
import { readApplicationDocument, reviewTeacherApplication } from "./service";

const decided = {
  id: "app-1",
  schoolName: "THPT Chuyên Lê Quý Đôn",
  user: { id: "u1", name: "Lan", email: "lan@example.com" },
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireRole.mockResolvedValue({ id: "admin-1" });
  mocks.decideApplication.mockResolvedValue(decided);
  mocks.send.mockResolvedValue(undefined);
});

describe("reviewTeacherApplication", () => {
  it("approves, records the reviewer and emails the applicant", async () => {
    await reviewTeacherApplication("app-1", { decision: "approve" });
    expect(mocks.decideApplication).toHaveBeenCalledWith({
      id: "app-1",
      reviewerId: "admin-1",
      status: "APPROVED",
      note: null,
    });
    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "lan@example.com",
        subject: expect.stringContaining("đã được duyệt"),
      }),
    );
  });

  it("requires a reason to reject", async () => {
    await expect(
      reviewTeacherApplication("app-1", {
        decision: "reject",
        note: "  ngắn ",
      }),
    ).rejects.toMatchObject({ status: 400, code: "INVALID_REVIEW" });
    expect(mocks.decideApplication).not.toHaveBeenCalled();
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("rejects with the reason and includes it in the email", async () => {
    await reviewTeacherApplication("app-1", {
      decision: "reject",
      note: "Minh chứng bị mờ, không đọc được.",
    });
    expect(mocks.decideApplication).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "REJECTED",
        note: "Minh chứng bị mờ, không đọc được.",
      }),
    );
    expect(mocks.send.mock.calls[0][0].text).toContain("Minh chứng bị mờ");
  });

  it("refuses an application that was already decided", async () => {
    mocks.decideApplication.mockResolvedValue(null);
    await expect(
      reviewTeacherApplication("app-1", { decision: "approve" }),
    ).rejects.toMatchObject({ status: 409, code: "ALREADY_REVIEWED" });
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("does not fail the review when the email cannot be sent", async () => {
    mocks.send.mockRejectedValue(new Error("smtp down"));
    await expect(
      reviewTeacherApplication("app-1", { decision: "approve" }),
    ).resolves.toBe(decided);
  });

  it("stops non-admins before touching the database", async () => {
    mocks.requireRole.mockRejectedValue(new Error("forbidden"));
    await expect(
      reviewTeacherApplication("app-1", { decision: "approve" }),
    ).rejects.toThrow("forbidden");
    expect(mocks.decideApplication).not.toHaveBeenCalled();
  });
});

describe("readApplicationDocument", () => {
  it("returns 404 when the file is not part of the application", async () => {
    mocks.findDocument.mockResolvedValue(null);
    await expect(readApplicationDocument("a", "d")).rejects.toMatchObject({
      status: 404,
    });
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it("reads the stored bytes for an admin", async () => {
    const document = { storageKey: "teacher-applications/u1/x.png" };
    mocks.findDocument.mockResolvedValue(document);
    mocks.get.mockResolvedValue(Buffer.from([1]));
    const result = await readApplicationDocument("a", "d");
    expect(result.document).toBe(document);
    expect(mocks.get).toHaveBeenCalledWith("teacher-applications/u1/x.png");
  });
});
