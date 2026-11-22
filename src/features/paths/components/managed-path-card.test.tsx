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
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("../management-actions", () => ({
  changePathUnlock: vi.fn(),
  deletePathAction: vi.fn(),
}));

vi.mock("../publication-actions", () => ({
  changePathPublication: vi.fn(),
}));

import {
  ManagedPathCard,
  resolveSequentialUnlock,
  type ManagedPathCardData,
} from "./managed-path-card";

const basePath: ManagedPathCardData = {
  id: "path-1",
  slug: "lap-trinh-cpp-co-ban",
  title: "Lập trình C++ cơ bản",
  description: "Học nền tảng ngôn ngữ C++ qua bài tập thực hành chấm tự động.",
  published: true,
  sequentialUnlock: true,
  difficulty: "MEDIUM",
  tags: ["C++", "nhập môn", "thuật toán", "lập trình"],
  estimatedMinutes: 150,
  coverTheme: "blue",
  postedLabel: "2 ngày trước",
  _count: {
    rooms: 6,
    enrollments: 42,
  },
};

describe("ManagedPathCard", () => {
  it("renders status, difficulty, metadata, truncated tags and primary manage link without direct edit button", () => {
    const html = renderToStaticMarkup(
      <ul>
        <ManagedPathCard path={basePath} />
      </ul>,
    );

    expect(html).toContain("Lập trình C++ cơ bản");
    expect(html).toContain("Đã xuất bản");
    expect(html).toContain("Trung bình");
    expect(html).toContain("6 bài học");
    expect(html).toContain("42 học viên");
    expect(html).toContain("2.5 giờ");
    expect(html).toContain("Tuần tự");
    expect(html).toContain("+1");
    expect(html).toContain('href="/gv/paths/lap-trinh-cpp-co-ban"');
    expect(html).not.toContain('href="/gv/paths/lap-trinh-cpp-co-ban/edit"');
    expect(html).not.toContain('role="menu"');
  });

  it("renders draft state, free unlock mode and overflow secondary menu actions", () => {
    const html = renderToStaticMarkup(
      <ul>
        <ManagedPathCard
          path={{
            ...basePath,
            published: false,
            sequentialUnlock: false,
            description: "",
            tags: [],
            estimatedMinutes: null,
          }}
          initialMenuOpen
        />
      </ul>,
    );

    expect(html).toContain("Bản nháp");
    expect(html).toContain("Mở tự do");
    expect(html).toContain("Chưa có mô tả lộ trình.");
    expect(html).toContain('role="menu"');
    expect(html).toContain("Xuất bản lộ trình");
    expect(html).toContain("Mở khóa tuần tự");
    expect(html).toContain("Xóa lộ trình");
  });
});

describe("resolveSequentialUnlock", () => {
  it("uses the server prop as source of truth when there is no override", () => {
    expect(
      resolveSequentialUnlock({ id: "p-1", sequentialUnlock: true }, null),
    ).toBe(true);
    expect(
      resolveSequentialUnlock({ id: "p-1", sequentialUnlock: false }, null),
    ).toBe(false);
  });

  it("applies optimistic override until server refresh updates the prop or path changes", () => {
    const override = { pathId: "p-1", baseValue: true, value: false };

    // Optimistic state while waiting for server action + router.refresh().
    expect(
      resolveSequentialUnlock({ id: "p-1", sequentialUnlock: true }, override),
    ).toBe(false);

    // Server refresh delivers updated prop -> automatically follows server prop.
    expect(
      resolveSequentialUnlock({ id: "p-1", sequentialUnlock: false }, override),
    ).toBe(false);

    // Component receives a different path -> ignores stale override.
    expect(
      resolveSequentialUnlock({ id: "p-2", sequentialUnlock: true }, override),
    ).toBe(true);
  });
});
