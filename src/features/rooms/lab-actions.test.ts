import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  guard: vi.fn(),
  path: vi.fn(),
  present: vi.fn(),
  access: vi.fn(),
  upsert: vi.fn(),
  deleteMany: vi.fn(),
  update: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("./lab", () => ({
  requireRoomLab: mocks.guard,
  getLabPath: mocks.path,
  presentLab: mocks.present,
}));
vi.mock("./access", () => ({ canAccessRoom: mocks.access }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/db", () => ({
  db: {
    roomProgress: { upsert: mocks.upsert, deleteMany: mocks.deleteMany },
    path: { update: mocks.update },
  },
}));
import { changeRoomLab } from "./lab-actions";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.guard.mockResolvedValue({ id: "current-student" });
  mocks.path.mockResolvedValue({
    id: "sandbox",
    slug: "sandbox-slug",
    rooms: [{ id: "sandbox-room" }],
  });
  mocks.present.mockResolvedValue({
    slug: "sandbox-slug",
    sequentialUnlock: true,
    rooms: [],
  });
});

it("does not mutate when the local guard fails", async () => {
  mocks.guard.mockRejectedValue(new Error("Disabled"));
  expect(
    (await changeRoomLab({ action: "toggle", enabled: false })).data,
  ).toBeNull();
  expect(mocks.update).not.toHaveBeenCalled();
});
it("rejects a real room outside the current student's sandbox", async () => {
  expect(
    (await changeRoomLab({ action: "complete", roomId: "real-room" })).error,
  ).toBeTruthy();
  expect(mocks.upsert).not.toHaveBeenCalled();
});
it("does not complete a locked sandbox room", async () => {
  mocks.access.mockResolvedValue(false);
  expect(
    (await changeRoomLab({ action: "complete", roomId: "sandbox-room" })).error,
  ).toBeTruthy();
  expect(mocks.upsert).not.toHaveBeenCalled();
});
it("writes only current-student progress and only the sandbox path flag", async () => {
  mocks.access.mockResolvedValue(true);
  await changeRoomLab({ action: "complete", roomId: "sandbox-room" });
  expect(mocks.upsert.mock.calls[0][0].create).toEqual({
    userId: "current-student",
    roomId: "sandbox-room",
  });
  await changeRoomLab({ action: "toggle", enabled: false });
  expect(mocks.update).toHaveBeenCalledWith({
    where: { id: "sandbox" },
    data: { sequentialUnlock: false },
  });
});
