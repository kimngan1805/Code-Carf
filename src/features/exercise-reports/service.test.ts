import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoleName } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { REPORT_MAX_LENGTH } from "./rules";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  access: vi.fn(),
  find: vi.fn(),
  create: vi.fn(),
}));
vi.mock("@/features/auth/service", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/features/rooms/access", () => ({ canAccessRoom: mocks.access }));
vi.mock("./repository", () => ({
  findReportExercise: mocks.find,
  createExerciseReport: mocks.create,
}));
import { reportExercise } from "./service";

const valid = { kind: "STATEMENT", description: "Ví dụ trong đề chưa đúng." };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireRole.mockResolvedValue({ id: "real-student" });
  mocks.find.mockResolvedValue({
    id: "exercise",
    room: { id: "real-room", path: { published: true } },
  });
  mocks.access.mockResolvedValue(true);
  mocks.create.mockResolvedValue({ id: "report" });
});

describe("student exercise reports", () => {
  it.each(["STATEMENT", "TEST_CASE", "AMBIGUOUS"])(
    "accepts %s and derives identity/Room on the server",
    async (kind) => {
      await expect(
        reportExercise("exercise", {
          kind,
          description: "  Có lỗi trong ví dụ.  ",
          userId: "victim",
          roomId: "wrong-room",
          exerciseId: "wrong-exercise",
        }),
      ).resolves.toEqual({ id: "report" });
      expect(mocks.requireRole).toHaveBeenCalledWith([RoleName.STUDENT]);
      expect(mocks.access).toHaveBeenCalledWith("real-student", "real-room");
      expect(mocks.create).toHaveBeenCalledWith(
        "real-student",
        "exercise",
        "real-room",
        { kind, description: "Có lỗi trong ví dụ." },
      );
    },
  );

  it.each([
    {},
    null,
    { ...valid, kind: "OTHER" },
    { ...valid, kind: "" },
    { ...valid, description: "   " },
    { ...valid, description: 123 },
    { ...valid, description: "x".repeat(REPORT_MAX_LENGTH + 1) },
  ])(
    "rejects invalid fields before querying the exercise: %j",
    async (input) => {
      await expect(reportExercise("exercise", input)).rejects.toMatchObject({
        status: 400,
        code: "INVALID_REPORT",
      });
      expect(mocks.find).not.toHaveBeenCalled();
      expect(mocks.create).not.toHaveBeenCalled();
    },
  );

  it("accepts the description length boundary", async () => {
    await expect(
      reportExercise("exercise", {
        ...valid,
        description: "x".repeat(REPORT_MAX_LENGTH),
      }),
    ).resolves.toEqual({ id: "report" });
  });

  it.each(["", "x".repeat(201)])(
    "rejects malformed exercise ids",
    async (id) => {
      await expect(reportExercise(id, valid)).rejects.toMatchObject({
        status: 400,
      });
      expect(mocks.find).not.toHaveBeenCalled();
    },
  );

  it.each([
    null,
    { id: "exercise", room: null },
    { id: "exercise", room: { id: "room", path: { published: false } } },
  ])(
    "rejects absent, contest-only and unpublished exercises",
    async (exercise) => {
      mocks.find.mockResolvedValue(exercise);
      await expect(reportExercise("exercise", valid)).rejects.toMatchObject({
        status: 404,
      });
      expect(mocks.access).not.toHaveBeenCalled();
      expect(mocks.create).not.toHaveBeenCalled();
    },
  );

  it("rejects locked or unenrolled Rooms", async () => {
    mocks.access.mockResolvedValue(false);
    await expect(reportExercise("exercise", valid)).rejects.toMatchObject({
      status: 403,
      code: "ROOM_LOCKED",
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it.each([401, 403])(
    "rejects unauthorized requests (%s) before lookup",
    async (status) => {
      mocks.requireRole.mockRejectedValue(
        new AppError(status, "FORBIDDEN", "Denied"),
      );
      await expect(reportExercise("exercise", valid)).rejects.toMatchObject({
        status,
      });
      expect(mocks.find).not.toHaveBeenCalled();
    },
  );

  it("propagates the persisted cooldown failure", async () => {
    mocks.create.mockRejectedValue(
      new AppError(429, "REPORT_RATE_LIMITED", "Wait"),
    );
    await expect(reportExercise("exercise", valid)).rejects.toMatchObject({
      status: 429,
      code: "REPORT_RATE_LIMITED",
    });
  });
});
