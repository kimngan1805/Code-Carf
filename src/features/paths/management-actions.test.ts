import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";

const mocks = vi.hoisted(() => ({
  deleteManagedPath: vi.fn(),
  setPathSequentialUnlock: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("./management", () => ({
  deleteManagedPath: mocks.deleteManagedPath,
  setPathSequentialUnlock: mocks.setPathSequentialUnlock,
}));

import { deletePathAction } from "./management-actions";

describe("deletePathAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.deleteManagedPath.mockResolvedValue({
      id: "path-1",
      slug: "cpp-basics",
      deletedAt: new Date("2026-11-22T12:00:00.000Z"),
    });
  });

  it("soft-deletes the path and revalidates teacher and student routes", async () => {
    await expect(deletePathAction({ pathId: " path-1 " })).resolves.toEqual({
      error: null,
    });

    expect(mocks.deleteManagedPath).toHaveBeenCalledWith("path-1");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/gv/paths");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/gv/paths/cpp-basics");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/hv/paths", "layout");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/hv/rooms", "layout");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/hv/dashboard");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/hv/search");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/leaderboard");
  });

  it.each([
    null,
    {},
    { pathId: "   " },
    { pathId: "x".repeat(201) },
    { pathId: "path-1", extra: true },
  ])(
    "rejects invalid payloads without calling the service: %j",
    async (payload) => {
      const result = await deletePathAction(payload);
      expect(result.error).toBe("Yêu cầu xóa lộ trình không hợp lệ.");
      expect(mocks.deleteManagedPath).not.toHaveBeenCalled();
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
    },
  );

  it("returns AppError messages for 403 and 404 failures", async () => {
    mocks.deleteManagedPath.mockRejectedValueOnce(
      new AppError(403, "FORBIDDEN", "Bạn không có quyền xóa lộ trình này."),
    );
    await expect(deletePathAction({ pathId: "path-1" })).resolves.toEqual({
      error: "Bạn không có quyền xóa lộ trình này.",
    });

    mocks.deleteManagedPath.mockRejectedValueOnce(
      new AppError(404, "PATH_NOT_FOUND", "Không tìm thấy lộ trình."),
    );
    await expect(deletePathAction({ pathId: "path-1" })).resolves.toEqual({
      error: "Không tìm thấy lộ trình.",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("hides unexpected database errors behind a safe message", async () => {
    mocks.deleteManagedPath.mockRejectedValue(new Error("Connection refused"));

    const result = await deletePathAction({ pathId: "path-1" });
    expect(result.error).toBe("Chưa thể xóa lộ trình. Vui lòng thử lại.");
    expect(result.error).not.toContain("Connection");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
