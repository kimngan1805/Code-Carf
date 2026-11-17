import { RoleName } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  roomFindFirst: vi.fn(),
  roomUpdateMany: vi.fn(),
}));

vi.mock("@/features/auth/service", () => ({
  requireRole: mocks.requireRole,
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
      content: "## Lý thuyết",
      path: { slug: "ts-basics" },
    });
    mocks.roomUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("publishes an owned room that has theory content", async () => {
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
      path: { creatorId: "teacher-1" },
    });
    expect(mocks.roomUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "room-1",
        path: { creatorId: "teacher-1" },
        content: { not: "" },
      },
      data: { published: true },
    });
  });

  it("allows admins to publish/unpublish another creator's room", async () => {
    mocks.requireRole.mockResolvedValue({
      id: "admin-1",
      role: { name: RoleName.ADMIN },
    });

    await setRoomPublication("room-1", true);

    expect(mocks.roomFindFirst.mock.calls[0][0].where).toEqual({
      id: "room-1",
    });
    expect(mocks.roomUpdateMany.mock.calls[0][0].where).not.toHaveProperty(
      "path",
    );
  });

  it("rejects publishing rooms with empty or whitespace-only content", async () => {
    mocks.roomFindFirst.mockResolvedValue({
      id: "room-1",
      content: "  \n ",
      path: { slug: "ts-basics" },
    });

    await expect(setRoomPublication("room-1", true)).rejects.toMatchObject({
      status: 400,
      code: "ROOM_NOT_READY",
    });
    expect(mocks.roomUpdateMany).not.toHaveBeenCalled();
  });

  it("allows moving a room back to draft even when content is empty", async () => {
    mocks.roomFindFirst.mockResolvedValue({
      id: "room-1",
      content: "",
      path: { slug: "ts-basics" },
    });

    await expect(setRoomPublication("room-1", false)).resolves.toEqual({
      id: "room-1",
      pathSlug: "ts-basics",
      published: false,
    });
    expect(mocks.roomUpdateMany).toHaveBeenCalledWith({
      where: { id: "room-1", path: { creatorId: "teacher-1" } },
      data: { published: false },
    });
  });

  it("denies foreign teachers from publishing or previewing", async () => {
    mocks.roomFindFirst.mockResolvedValue(null);

    await expect(
      setRoomPublication("foreign-room", true),
    ).rejects.toMatchObject({
      status: 404,
      code: "ROOM_NOT_FOUND",
    });
    await expect(
      getManagedRoomPreview("foreign-path", "foreign-room"),
    ).rejects.toMatchObject({
      status: 404,
      code: "ROOM_NOT_FOUND",
    });
    expect(mocks.roomUpdateMany).not.toHaveBeenCalled();
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

  it("returns student-compatible preview payload with simulated exercise progress", async () => {
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
