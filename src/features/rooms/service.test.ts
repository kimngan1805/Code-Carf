import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  canAccessRoom: vi.fn(),
  findRoomAccess: vi.fn(),
  findRoomContent: vi.fn(),
}));
vi.mock("@/features/auth/service", () => ({ requireRole: mocks.requireRole }));
vi.mock("./access", () => ({ canAccessRoom: mocks.canAccessRoom }));
vi.mock("./repository", () => ({
  findRoomAccess: mocks.findRoomAccess,
  findRoomContent: mocks.findRoomContent,
}));
import { getRoom } from "./service";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireRole.mockResolvedValue({ id: "user-1" });
  mocks.findRoomAccess.mockResolvedValue({ path: { published: true } });
});
describe("room content authorization", () => {
  it("returns 403 and never reads locked content", async () => {
    mocks.canAccessRoom.mockResolvedValue(false);
    await expect(getRoom("room-1")).rejects.toMatchObject({
      status: 403,
      code: "ROOM_LOCKED",
    });
    expect(mocks.findRoomContent).not.toHaveBeenCalled();
  });
  it("only loads room content after the current learner passes the contract", async () => {
    mocks.canAccessRoom.mockResolvedValue(true);
    mocks.findRoomContent.mockResolvedValue({
      id: "room-1",
      content: "Theory",
    });
    await expect(getRoom("room-1")).resolves.toMatchObject({
      content: "Theory",
    });
    expect(mocks.canAccessRoom).toHaveBeenCalledWith("user-1", "room-1");
  });
  it.each([null, { path: { published: false } }])(
    "hides missing and unpublished content",
    async (room) => {
      mocks.findRoomAccess.mockResolvedValue(room);
      await expect(getRoom("room-1")).rejects.toMatchObject({ status: 404 });
      expect(mocks.findRoomContent).not.toHaveBeenCalled();
    },
  );
  it("authenticates before querying room metadata", async () => {
    mocks.requireRole.mockRejectedValue(new Error("Unauthorized"));
    await expect(getRoom("room-1")).rejects.toThrow("Unauthorized");
    expect(mocks.findRoomAccess).not.toHaveBeenCalled();
  });
});
