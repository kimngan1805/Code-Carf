import { RoleName } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  roomFindFirst: vi.fn(),
  roomUpdateMany: vi.fn(),
  notifyNewLessonPublished: vi.fn(),
}));

vi.mock("@/features/auth/service", () => ({
  requireRole: mocks.requireRole,
}));

vi.mock("@/features/notifications/writer", () => ({
  notifyNewLessonPublished: mocks.notifyNewLessonPublished,
}));

vi.mock("@/lib/db", () => ({
  db: {
    room: {
      findFirst: mocks.roomFindFirst,
      updateMany: mocks.roomUpdateMany,
    },
  },
}));

import { getManagedRoomPreview } from "@/features/paths/management";
import { setRoomPublication } from "./publication";

describe("room publication & teacher preview", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireRole.mockResolvedValue({
      id: "teacher-1",
      role: { name: RoleName.TEACHER },
    });
    mocks.roomFindFirst.mockResolvedValue({
      id: "room-1",
      title: "Biến & Kiểu",
      content: "## Lý thuyết",
      published: false,
      path: {
        id: "path-1",
        slug: "ts-basics",
        title: "TS Basics",
        published: true,
      },
    });
    mocks.roomUpdateMany.mockResolvedValue({ count: 1 });
    mocks.notifyNewLessonPublished.mockResolvedValue(2);
  });

  it("publishes an owned room on an active published path and sends NEW_LESSON notification", async () => {
    await expect(setRoomPublication("room-1", true)).resolves.toEqual({
      id: "room-1",
      pathSlug: "ts-basics",
      published: true,
    });

    expect(mocks.requireRole).toHaveBeenCalledWith([
      RoleName.TEACHER,
      RoleName.ADMIN,
    ]);
    expect(mocks.roomFindFirst.mock.calls[0][0].where).toEqual({
      id: "room-1",
      path: { deletedAt: null, creatorId: "teacher-1" },
    });
    expect(mocks.roomUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "room-1",
        path: { deletedAt: null, creatorId: "teacher-1" },
        content: { not: "" },
      },
      data: { published: true },
    });
    expect(mocks.notifyNewLessonPublished).toHaveBeenCalledTimes(1);
    expect(mocks.notifyNewLessonPublished).toHaveBeenCalledWith({
      pathId: "path-1",
      pathTitle: "TS Basics",
      roomId: "room-1",
      roomTitle: "Biến & Kiểu",
      actorUserId: "teacher-1",
    });
  });

  it("does not notify when publishing a room inside a draft path or when room is already published", async () => {
    mocks.roomFindFirst.mockResolvedValueOnce({
      id: "room-1",
      title: "Biến & Kiểu",
      content: "## Lý thuyết",
      published: false,
      path: {
        id: "path-1",
        slug: "ts-basics",
        title: "TS Basics",
        published: false,
      },
    });

    await setRoomPublication("room-1", true);
    expect(mocks.notifyNewLessonPublished).not.toHaveBeenCalled();

    mocks.roomFindFirst.mockResolvedValueOnce({
      id: "room-1",
      title: "Biến & Kiểu",
      content: "## Lý thuyết",
      published: true,
      path: {
        id: "path-1",
        slug: "ts-basics",
        title: "TS Basics",
        published: true,
      },
    });

    await setRoomPublication("room-1", true);
    expect(mocks.notifyNewLessonPublished).not.toHaveBeenCalled();
  });

  it("allows admins to publish/unpublish another creator's room while excluding soft-deleted paths", async () => {
    mocks.requireRole.mockResolvedValue({
      id: "admin-1",
      role: { name: RoleName.ADMIN },
    });

    await setRoomPublication("room-1", true);

    expect(mocks.roomFindFirst.mock.calls[0][0].where).toEqual({
      id: "room-1",
      path: { deletedAt: null },
    });
    expect(mocks.roomUpdateMany.mock.calls[0][0].where).toEqual({
      id: "room-1",
      path: { deletedAt: null },
      content: { not: "" },
    });
  });

  it("rejects publishing rooms with empty or whitespace-only content", async () => {
    mocks.roomFindFirst.mockResolvedValue({
      id: "room-1",
      title: "Empty",
      content: "  \n ",
      published: false,
      path: {
        id: "path-1",
        slug: "ts-basics",
        title: "TS Basics",
        published: true,
      },
    });

    await expect(setRoomPublication("room-1", true)).rejects.toMatchObject({
      status: 400,
      code: "ROOM_NOT_READY",
    });
    expect(mocks.roomUpdateMany).not.toHaveBeenCalled();
    expect(mocks.notifyNewLessonPublished).not.toHaveBeenCalled();
  });

  it("allows moving a room back to draft without sending notifications", async () => {
    mocks.roomFindFirst.mockResolvedValue({
      id: "room-1",
      title: "Biến & Kiểu",
      content: "",
      published: true,
      path: {
        id: "path-1",
        slug: "ts-basics",
        title: "TS Basics",
        published: true,
      },
    });

    await expect(setRoomPublication("room-1", false)).resolves.toEqual({
      id: "room-1",
      pathSlug: "ts-basics",
      published: false,
    });
    expect(mocks.roomUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "room-1",
        path: { deletedAt: null, creatorId: "teacher-1" },
      },
      data: { published: false },
    });
    expect(mocks.notifyNewLessonPublished).not.toHaveBeenCalled();
  });

  it("denies foreign teachers and soft-deleted paths from publishing or previewing", async () => {
    mocks.roomFindFirst.mockResolvedValue(null);

    await expect(
      setRoomPublication("foreign-room", true),
    ).rejects.toMatchObject({
      status: 404,
      code: "ROOM_NOT_FOUND",
    });
    await expect(
      getManagedRoomPreview("deleted-path", "deleted-room"),
    ).rejects.toMatchObject({
      status: 404,
      code: "ROOM_NOT_FOUND",
    });
    expect(mocks.roomFindFirst.mock.calls[1][0].where).toEqual({
      id: "deleted-room",
      path: { slug: "deleted-path", deletedAt: null, creatorId: "teacher-1" },
    });
    expect(mocks.roomUpdateMany).not.toHaveBeenCalled();
    expect(mocks.notifyNewLessonPublished).not.toHaveBeenCalled();
  });

  it("stops unauthorized roles before querying the database", async () => {
    mocks.requireRole.mockRejectedValue(
      new AppError(403, "FORBIDDEN", "Insufficient permission"),
    );

    await expect(setRoomPublication("room-1", true)).rejects.toMatchObject({
      status: 403,
    });
    await expect(
      getManagedRoomPreview("ts-basics", "room-1"),
    ).rejects.toMatchObject({
      status: 403,
    });
    expect(mocks.roomFindFirst).not.toHaveBeenCalled();
  });

  it("returns student-compatible preview payload without selecting hidden test cases or rubrics", async () => {
    mocks.roomFindFirst.mockResolvedValue({
      id: "room-1",
      title: "Biến & Kiểu",
      description: "Mô tả",
      content: "# Nội dung Markdown",
      published: false,
      path: { title: "TS Basics", slug: "ts-basics", published: true },
      exercises: [
        {
          id: "ex-1",
          title: "Bài 1",
          prompt: "Đề bài 1",
          kind: "CODE",
          points: 100,
        },
      ],
    });

    const preview = await getManagedRoomPreview("ts-basics", "room-1");

    const exerciseSelect =
      mocks.roomFindFirst.mock.calls[0][0].select.exercises.select;
    expect(exerciseSelect).toEqual({
      id: true,
      title: true,
      prompt: true,
      kind: true,
      points: true,
    });
    expect(exerciseSelect).not.toHaveProperty("testCases");
    expect(exerciseSelect).not.toHaveProperty("rubric");

    expect(preview).toEqual({
      accessible: true,
      id: "room-1",
      title: "Biến & Kiểu",
      description: "Mô tả",
      content: "# Nội dung Markdown",
      published: false,
      path: { title: "TS Basics", slug: "ts-basics", published: true },
      exercises: [
        {
          id: "ex-1",
          title: "Bài 1",
          prompt: "Đề bài 1",
          kind: "CODE",
          points: 100,
          state: "not_started",
        },
      ],
      passedExercises: 0,
    });
  });
});
