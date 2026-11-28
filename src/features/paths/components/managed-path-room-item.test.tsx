import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) =>
    React.createElement("a", { href, ...props }, children),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

// Nút "Thêm nội dung" gọi server action; bài test chỉ kiểm tra phần hiển thị.
vi.mock("@/features/library/actions", () => ({
  addLibraryItemToRoomAction: vi.fn(),
  getLibraryPickerAction: vi.fn(),
}));

vi.mock("@/features/rooms/authoring-actions", () => ({
  addLessonVideoAction: vi.fn(),
}));

import {
  ManagedPathRoomItem,
  type ManagedPathRoomItemData,
} from "./managed-path-room-item";

const base: ManagedPathRoomItemData = {
  id: "room-1",
  position: 1,
  title: "Con trỏ cơ bản",
  description: "Địa chỉ, toán tử & và *.",
  hasMaterial: true,
  contentSummary: "12 mục · 1 video · 580 ký tự",
  videos: [{ id: "ubPxYhz1wvU", caption: "HowKteam · Bài 42" }],
  attachments: [
    { id: "file-1", fileName: "bai-1.pdf", contentType: "application/pdf" },
  ],
  exercises: [
    { id: "ex-1", title: "Hoán đổi bằng con trỏ", kind: "CODE" },
    { id: "ex-2", title: "Trắc nghiệm con trỏ", kind: "QUIZ" },
  ],
  _count: { exercises: 2 },
};

function render(room: ManagedPathRoomItemData) {
  return renderToStaticMarkup(
    <ol>
      <ManagedPathRoomItem pathSlug="con-tro" room={room} />
    </ol>,
  );
}

describe("ManagedPathRoomItem", () => {
  it("is an open, collapsible block listing everything the lesson contains", () => {
    const html = render(base);
    expect(html).toContain("<details open");
    expect(html).toContain("Bài 1: Con trỏ cơ bản");
    expect(html).toContain("1 video · 1 tài liệu · 2 bài tập");
    // Từng thứ trong bài, kèm loại và hành động.
    expect(html).toContain("12 mục · 1 video · 580 ký tự");
    expect(html).toContain("HowKteam · Bài 42");
    expect(html).toContain("https://www.youtube.com/watch?v=ubPxYhz1wvU");
    expect(html).toContain("bai-1.pdf");
    expect(html).toContain('href="/api/rooms/room-1/attachments/file-1"');
    expect(html).toContain("Bài code");
    expect(html).toContain("Trắc nghiệm");
    expect(html).toContain(
      'href="/gv/paths/con-tro/rooms/room-1/exercises/ex-2/edit"',
    );
    expect(html).not.toContain("Bài trống");
  });

  it("keeps the preview, manage and add-content actions without a status badge", () => {
    const html = render(base);
    expect(html).toContain('href="/gv/paths/con-tro/rooms/room-1/preview"');
    expect(html).toContain('href="/gv/paths/con-tro/rooms/room-1"');
    expect(html).toContain("Thêm nội dung");
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).not.toContain("Đã xuất bản");
    expect(html).not.toContain("Bản nháp");
  });

  it("shows a lesson with only a PDF without a text row", () => {
    const html = render({
      ...base,
      contentSummary: null,
      videos: [],
      exercises: [],
      _count: { exercises: 0 },
    });
    expect(html).toContain("1 tài liệu · Chưa có bài tập");
    expect(html).not.toContain("Lý thuyết");
    expect(html).toContain("bai-1.pdf");
  });

  it("flags an empty lesson that blocks publishing", () => {
    const html = render({
      ...base,
      hasMaterial: false,
      contentSummary: null,
      videos: [],
      attachments: [],
      exercises: [],
      _count: { exercises: 0 },
    });
    expect(html).toContain("Bài trống, chưa xuất bản được");
    expect(html).toContain("Bài chưa có gì để học");
  });
});
