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

import { ManagedPathRoomItem } from "./managed-path-room-item";

describe("ManagedPathRoomItem", () => {
  it("renders published room metadata with preview and manage links and without direct edit or add-exercise actions", () => {
    const html = renderToStaticMarkup(
      <ol>
        <ManagedPathRoomItem
          pathSlug="cpp-co-ban"
          room={{
            id: "room-1",
            position: 1,
            title: "Biến, hằng và toán tử trong C++",
            description: "Giới thiệu các kiểu dữ liệu cơ bản.",
            published: true,
            _count: { exercises: 4 },
          }}
        />
      </ol>,
    );

    expect(html).toContain("Biến, hằng và toán tử trong C++");
    expect(html).toContain("Đã xuất bản");
    expect(html).toContain("4 bài tập");
    expect(html).toContain("Xem như học viên");
    expect(html).toContain("Quản lý");
    expect(html).toContain('href="/gv/paths/cpp-co-ban/rooms/room-1"');
    expect(html).toContain('href="/gv/paths/cpp-co-ban/rooms/room-1/preview"');
    expect(html).not.toContain('href="/gv/paths/cpp-co-ban/rooms/room-1/edit"');
    expect(html).not.toContain("/exercises/new");
  });

  it("renders draft room with a concise empty-exercise hint and no cluttered secondary links", () => {
    const html = renderToStaticMarkup(
      <ol>
        <ManagedPathRoomItem
          pathSlug="cpp-co-ban"
          room={{
            id: "room-2",
            position: 2,
            title: "Vòng lặp nâng cao",
            description: "",
            published: false,
            _count: { exercises: 0 },
          }}
        />
      </ol>,
    );

    expect(html).toContain("Vòng lặp nâng cao");
    expect(html).toContain("Bản nháp");
    expect(html).toContain("Chưa có bài tập");
    expect(html).toContain('href="/gv/paths/cpp-co-ban/rooms/room-2/preview"');
    expect(html).toContain('href="/gv/paths/cpp-co-ban/rooms/room-2"');
    expect(html).not.toContain('href="/gv/paths/cpp-co-ban/rooms/room-2/edit"');
    expect(html).not.toContain("Thêm bài tập");
  });
});
