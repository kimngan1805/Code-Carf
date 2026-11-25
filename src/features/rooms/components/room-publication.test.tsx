import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createSingleFlight } from "@/features/grading/single-flight";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement("a", { href, ...props }, children),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("../publication-actions", () => ({
  changeRoomPublication: vi.fn(),
}));

import { RoomPublication, runRoomPublicationToggle } from "./room-publication";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe("RoomPublication header", () => {
  it("renders draft room header with primary publish CTA, preview, edit links and single status badge", () => {
    const html = renderToStaticMarkup(
      <RoomPublication
        roomId="room-1"
        title="Biến và kiểu dữ liệu"
        description="Làm quen với khai báo biến."
        published={false}
        pathPublished={false}
        exerciseCount={0}
        previewHref="/gv/paths/ts-basics/rooms/room-1/preview"
        editHref="/gv/paths/ts-basics/rooms/room-1/edit"
      />,
    );

    expect(html).toContain("Biến và kiểu dữ liệu");
    expect(html).toContain("Làm quen với khai báo biến.");
    expect(html).toContain("Bản nháp");
    expect(html).not.toContain("Trạng thái hiển thị:");
    expect(html).toContain("Xuất bản bài học");
    expect(html).toContain("Xem như học viên");
    expect(html).toContain("Chỉnh sửa bài học");
    expect(html).toContain('href="/gv/paths/ts-basics/rooms/room-1/preview"');
    expect(html).toContain('href="/gv/paths/ts-basics/rooms/room-1/edit"');
    expect(html).toContain("Lộ trình chứa bài này đang ở bản nháp");
    // Primary publish action appears before preview & edit when draft.
    expect(html.indexOf("Xuất bản bài học")).toBeLessThan(
      html.indexOf("Xem như học viên"),
    );
  });

  it("renders published room header with secondary preview, edit and outline move-to-draft button", () => {
    const html = renderToStaticMarkup(
      <RoomPublication
        roomId="room-1"
        title="Hàm và tham số"
        description=""
        published={true}
        pathPublished={true}
        exerciseCount={3}
        previewHref="/gv/paths/ts-basics/rooms/room-1/preview"
        editHref="/gv/paths/ts-basics/rooms/room-1/edit"
      />,
    );

    expect(html).toContain("Đã xuất bản");
    expect(html).toContain("3 bài tập");
    expect(html).toContain("Chuyển về bản nháp");
    expect(html).not.toContain("bg-destructive");
    expect(html.indexOf("Xem như học viên")).toBeLessThan(
      html.indexOf("Chuyển về bản nháp"),
    );
  });
});

describe("runRoomPublicationToggle", () => {
  it("publishes a draft room, refreshes, and guards against double-submit", async () => {
    const flight = createSingleFlight();
    const gate = deferred<{ error: string | null }>();
    const action = vi.fn(() => gate.promise);
    const onRefresh = vi.fn();

    const first = runRoomPublicationToggle({
      flight,
      roomId: "room-1",
      published: false,
      action,
      onRefresh,
    });
    const duplicate = runRoomPublicationToggle({
      flight,
      roomId: "room-1",
      published: false,
      action,
      onRefresh,
    });

    expect(await duplicate).toEqual({
      started: false,
      ok: false,
      error: null,
      message: null,
    });
    expect(action).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenCalledWith({ roomId: "room-1", published: true });

    gate.resolve({ error: null });
    expect(await first).toMatchObject({
      started: true,
      ok: true,
      error: null,
      message: expect.stringContaining("Đã xuất bản bài học"),
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("moves a published room back to draft and surfaces server or network errors without refreshing", async () => {
    const okAction = vi.fn().mockResolvedValue({ error: null });
    const onRefresh = vi.fn();

    const draftResult = await runRoomPublicationToggle({
      flight: createSingleFlight(),
      roomId: "room-1",
      published: true,
      action: okAction,
      onRefresh,
    });
    expect(okAction).toHaveBeenCalledWith({
      roomId: "room-1",
      published: false,
    });
    expect(draftResult).toMatchObject({
      started: true,
      ok: true,
      message: expect.stringContaining("Đã chuyển bài học về bản nháp"),
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);

    const errRefresh = vi.fn();
    const errResult = await runRoomPublicationToggle({
      flight: createSingleFlight(),
      roomId: "room-1",
      published: false,
      action: vi.fn().mockResolvedValue({
        error: "Hãy điền nội dung lý thuyết cho bài học trước khi xuất bản.",
      }),
      onRefresh: errRefresh,
    });
    expect(errResult).toEqual({
      started: true,
      ok: false,
      error: "Hãy điền nội dung lý thuyết cho bài học trước khi xuất bản.",
      message: null,
    });
    expect(errRefresh).not.toHaveBeenCalled();

    const netResult = await runRoomPublicationToggle({
      flight: createSingleFlight(),
      roomId: "room-1",
      published: false,
      action: vi.fn().mockRejectedValue(new Error("offline")),
      onRefresh: errRefresh,
    });
    expect(netResult).toEqual({
      started: true,
      ok: false,
      error: "Không thể kết nối. Vui lòng thử lại.",
      message: null,
    });
    expect(errRefresh).not.toHaveBeenCalled();
  });
});
