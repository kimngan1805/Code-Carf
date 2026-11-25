import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({
  role: vi.fn(),
  find: vi.fn(),
  update: vi.fn(),
}));
vi.mock("@/features/auth/service", () => ({ requireRole: mocks.role }));
vi.mock("@/lib/db", () => ({
  db: { room: { findFirst: mocks.find, updateMany: mocks.update } },
}));
import { addLessonVideo } from "./authoring";

const input = {
  pathSlug: "con-tro",
  roomId: "room-1",
  url: "https://youtu.be/ubPxYhz1wvU",
  caption: "Bài 42",
};
const room = {
  id: "room-1",
  pathId: "path-1",
  content: "# Con trỏ\n\n## Tổng quan\n\nGiới thiệu.\n\n## Khái niệm\n\nA",
  path: { slug: "con-tro" },
};

async function failure(run: Promise<unknown>) {
  const error = await run.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(AppError);
  return error as AppError;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.role.mockResolvedValue({ id: "teacher-1", role: { name: "TEACHER" } });
  mocks.find.mockResolvedValue(room);
  mocks.update.mockResolvedValue({ count: 1 });
});

describe("addLessonVideo", () => {
  it("only lets teachers and admins add videos", async () => {
    mocks.role.mockRejectedValue(
      new AppError(403, "FORBIDDEN", "Không có quyền"),
    );
    expect((await failure(addLessonVideo(input))).status).toBe(403);
    expect(mocks.role).toHaveBeenCalledWith(["TEACHER", "ADMIN"]);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("scopes the lesson to a live path the teacher created", async () => {
    await addLessonVideo(input);
    expect(mocks.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "room-1",
          path: { slug: "con-tro", deletedAt: null, creatorId: "teacher-1" },
        },
      }),
    );
  });

  it("lets an admin add videos to any path", async () => {
    mocks.role.mockResolvedValue({ id: "admin-1", role: { name: "ADMIN" } });
    await addLessonVideo(input);
    expect(mocks.find.mock.calls[0][0].where.path).toEqual({
      slug: "con-tro",
      deletedAt: null,
    });
  });

  it("returns 404 when the lesson is not in a path the teacher manages", async () => {
    mocks.find.mockResolvedValue(null);
    expect((await failure(addLessonVideo(input))).status).toBe(404);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("writes the video under the overview, guarded by the content it read", async () => {
    await expect(addLessonVideo(input)).resolves.toEqual({
      id: "room-1",
      slug: "con-tro",
    });
    const call = mocks.update.mock.calls[0][0];
    expect(call.where).toEqual({
      id: "room-1",
      pathId: "path-1",
      content: room.content,
    });
    expect(call.data.content).toBe(
      "# Con trỏ\n\n## Tổng quan\n\nGiới thiệu.\n\n### Video bài giảng\n\nhttps://www.youtube.com/watch?v=ubPxYhz1wvU\n\n_Bài 42_\n\n## Khái niệm\n\nA",
    );
  });

  it("rejects links that are not YouTube videos", async () => {
    const error = await failure(
      addLessonVideo({ ...input, url: "https://drive.google.com/file/d/x" }),
    );
    expect(error.code).toBe("INVALID_VIDEO_URL");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects a video already in the lesson", async () => {
    mocks.find.mockResolvedValue({
      ...room,
      content: `${room.content}\n\nhttps://www.youtube.com/watch?v=ubPxYhz1wvU`,
    });
    expect((await failure(addLessonVideo(input))).code).toBe("VIDEO_EXISTS");
  });

  it("re-reads and retries when someone else saved the lesson meanwhile", async () => {
    mocks.update
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });
    await addLessonVideo(input);
    expect(mocks.find).toHaveBeenCalledTimes(2);
    expect(mocks.update).toHaveBeenCalledTimes(2);
  });

  it("gives up after three conflicting attempts", async () => {
    mocks.update.mockResolvedValue({ count: 0 });
    expect((await failure(addLessonVideo(input))).code).toBe("LESSON_BUSY");
    expect(mocks.update).toHaveBeenCalledTimes(3);
  });

  it("rejects unknown fields", async () => {
    expect(
      (await failure(addLessonVideo({ ...input, content: "ghi đè" }))).status,
    ).toBe(400);
  });
});
