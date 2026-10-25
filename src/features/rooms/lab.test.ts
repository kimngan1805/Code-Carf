import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ headers: vi.fn(), requireRole: vi.fn() }));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("@/features/auth/service", () => ({ requireRole: mocks.requireRole }));
import { requireRoomLab } from "./lab";

beforeEach(() => {
  vi.stubEnv("ROOM_UNLOCK_LAB", "1");
  vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5433/test");
  mocks.headers.mockResolvedValue(new Headers({ host: "localhost:3000" }));
  mocks.requireRole.mockResolvedValue({ id: "student-1" });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("room lab access", () => {
  it("allows an authenticated student on an explicitly enabled loopback setup", async () => {
    await expect(requireRoomLab()).resolves.toEqual({ id: "student-1" });
    expect(mocks.requireRole).toHaveBeenCalledWith(["STUDENT"]);
  });
  it.each([
    {
      name: "disabled flag",
      flag: "0",
      host: "localhost:3000",
      database: "localhost",
    },
    {
      name: "public host",
      flag: "1",
      host: "app.example.com",
      database: "localhost",
    },
    {
      name: "remote database",
      flag: "1",
      host: "localhost:3000",
      database: "db.example.com",
    },
  ])("hides the tool for $name", async ({ flag, host, database }) => {
    vi.stubEnv("ROOM_UNLOCK_LAB", flag);
    vi.stubEnv("DATABASE_URL", `postgresql://test:test@${database}/test`);
    mocks.headers.mockResolvedValue(new Headers({ host }));
    await expect(requireRoomLab()).rejects.toMatchObject({ status: 404 });
    expect(mocks.requireRole).not.toHaveBeenCalled();
  });
  it("still rejects unauthorized users on localhost", async () => {
    mocks.requireRole.mockRejectedValue(new Error("Unauthorized"));
    await expect(requireRoomLab()).rejects.toThrow("Unauthorized");
  });
});
