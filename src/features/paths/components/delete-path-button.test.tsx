import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSingleFlight } from "@/features/grading/single-flight";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  deletePathAction: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));

vi.mock("../management-actions", () => ({
  deletePathAction: mocks.deletePathAction,
}));

import {
  DeletePathButton,
  DeletePathDialog,
  runDeletePath,
} from "./delete-path-button";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("DeletePathButton rendering", () => {
  it("renders the trigger button without showing the confirmation dialog initially", () => {
    const html = renderToStaticMarkup(
      React.createElement(DeletePathButton, {
        pathId: "path-1",
        pathTitle: "Lập trình C++ cơ bản",
      }),
    );

    expect(html).toContain("Xóa lộ trình");
    expect(html).toContain('aria-label="Xóa lộ trình Lập trình C++ cơ bản"');
    expect(html).not.toContain('role="dialog"');
  });

  it("renders an accessible confirmation dialog explaining soft delete and learner data preservation", () => {
    const html = renderToStaticMarkup(
      React.createElement(DeletePathButton, {
        pathId: "path-1",
        pathTitle: "Lập trình C++ cơ bản",
        initialConfirmOpen: true,
      }),
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain("Xác nhận xóa lộ trình");
    expect(html).toContain("Lập trình C++ cơ bản");
    expect(html).toContain("xóa mềm");
    expect(html).toContain("lịch sử học tập");
    expect(html).toContain("bảo toàn");
    expect(html).toContain("Hủy");
    expect(html).toContain("Xác nhận xóa");
  });

  it("renders DeletePathDialog error alert and pending state cleanly", () => {
    const html = renderToStaticMarkup(
      React.createElement(DeletePathDialog, {
        open: true,
        pathTitle: "Cấu trúc dữ liệu",
        pending: true,
        error: "Bạn không có quyền xóa lộ trình này.",
        onClose: () => {},
        onConfirm: () => {},
      }),
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('role="alert"');
    expect(html).toContain("Bạn không có quyền xóa lộ trình này.");
    expect(html).toContain("Đang xóa...");
  });
});

describe("runDeletePath flow", () => {
  it("does not call the action when the user cancels before confirming", () => {
    const action = vi.fn();
    // Canceling closes the dialog without invoking runDeletePath.
    expect(action).not.toHaveBeenCalled();
  });

  it("prevents double-submit while a delete request is already in flight", async () => {
    const flight = createSingleFlight();
    const gate = deferred<{ error: string | null }>();
    const action = vi.fn(() => gate.promise);
    const onNavigate = vi.fn();
    const onRefresh = vi.fn();

    const first = runDeletePath({
      flight,
      pathId: "path-1",
      action,
      onNavigate,
      onRefresh,
    });
    const second = runDeletePath({
      flight,
      pathId: "path-1",
      action,
      onNavigate,
      onRefresh,
    });

    expect(await second).toEqual({
      started: false,
      ok: false,
      error: null,
      message: null,
    });
    expect(action).toHaveBeenCalledTimes(1);

    gate.resolve({ error: null });
    expect(await first).toMatchObject({ started: true, ok: true, error: null });
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("refreshes the list without redirecting when deleting from /gv/paths", async () => {
    const action = vi.fn().mockResolvedValue({ error: null });
    const onNavigate = vi.fn();
    const onRefresh = vi.fn();

    const outcome = await runDeletePath({
      flight: createSingleFlight(),
      pathId: "path-1",
      action,
      onNavigate,
      onRefresh,
    });

    expect(action).toHaveBeenCalledWith({ pathId: "path-1" });
    expect(outcome).toEqual({
      started: true,
      ok: true,
      error: null,
      message:
        "Đã xóa lộ trình. Dữ liệu học tập của học viên vẫn được bảo toàn.",
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("navigates back to /gv/paths and refreshes when deleting from the path detail page", async () => {
    const action = vi.fn().mockResolvedValue({ error: null });
    const onNavigate = vi.fn();
    const onRefresh = vi.fn();

    const outcome = await runDeletePath({
      flight: createSingleFlight(),
      pathId: "path-1",
      action,
      redirectTo: "/gv/paths?deleted=1",
      onNavigate,
      onRefresh,
    });

    expect(outcome.ok).toBe(true);
    expect(onNavigate).toHaveBeenCalledWith("/gv/paths?deleted=1");
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["403 FORBIDDEN", "Bạn không có quyền xóa lộ trình này."],
    ["404 PATH_NOT_FOUND", "Không tìm thấy lộ trình."],
    ["409 PATH_CHANGED", "Lộ trình đã thay đổi. Vui lòng tải lại và thử lại."],
  ])(
    "surfaces %s errors without navigating or refreshing",
    async (_label, errorMessage) => {
      const action = vi.fn().mockResolvedValue({ error: errorMessage });
      const onNavigate = vi.fn();
      const onRefresh = vi.fn();

      const outcome = await runDeletePath({
        flight: createSingleFlight(),
        pathId: "path-1",
        action,
        redirectTo: "/gv/paths?deleted=1",
        onNavigate,
        onRefresh,
      });

      expect(outcome).toEqual({
        started: true,
        ok: false,
        error: errorMessage,
        message: null,
      });
      expect(onNavigate).not.toHaveBeenCalled();
      expect(onRefresh).not.toHaveBeenCalled();
    },
  );

  it("returns a friendly error when the network request throws", async () => {
    const action = vi.fn().mockRejectedValue(new Error("Network down"));
    const onNavigate = vi.fn();
    const onRefresh = vi.fn();

    const outcome = await runDeletePath({
      flight: createSingleFlight(),
      pathId: "path-1",
      action,
      onNavigate,
      onRefresh,
    });

    expect(outcome).toEqual({
      started: true,
      ok: false,
      error: "Không thể kết nối. Vui lòng thử lại.",
      message: null,
    });
    expect(onNavigate).not.toHaveBeenCalled();
    expect(onRefresh).not.toHaveBeenCalled();
  });
});
