import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({
  getRoom: vi.fn(),
}));

vi.mock("@/features/rooms/service", () => ({
  getRoom: mocks.getRoom,
}));

import { GET } from "./route";

describe("GET /api/rooms/[roomId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 with no-store when room is draft or missing", async () => {
    mocks.getRoom.mockRejectedValue(
      new AppError(404, "ROOM_NOT_FOUND", "Không tìm thấy bài học."),
    );

    const response = await GET(
      new Request("http://localhost:3000/api/rooms/draft-room"),
      { params: Promise.resolve({ roomId: "draft-room" }) },
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({
      data: null,
      error: { code: "ROOM_NOT_FOUND" },
    });
  });

  it("returns room content with Cache-Control: no-store when published and accessible", async () => {
    mocks.getRoom.mockResolvedValue({
      id: "room-1",
      title: "Room 1",
      content: "# Theory",
      exercises: [],
    });

    const response = await GET(
      new Request("http://localhost:3000/api/rooms/room-1"),
      { params: Promise.resolve({ roomId: "room-1" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      data: {
        id: "room-1",
        title: "Room 1",
        content: "# Theory",
        exercises: [],
      },
      error: null,
    });
  });
});
