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

vi.mock("../details-actions", () => ({
  updatePathDetailsAction: vi.fn(),
}));

vi.mock("../management-actions", () => ({
  changePathUnlock: vi.fn(),
}));

vi.mock("../publication-actions", () => ({
  changePathPublication: vi.fn(),
}));

import { CreatePathForm, parseTagPreview } from "./create-path-form";
import { PathPublication } from "./path-publication";
import { PathUnlockSetting } from "./path-unlock-setting";

describe("parseTagPreview", () => {
  it("trims whitespace, ignores blanks and deduplicates case-insensitively", () => {
    expect(parseTagPreview(" C++, python , c++, , Thuật toán ")).toEqual([
      "C++",
      "python",
      "Thuật toán",
    ]);
  });
});

describe("CreatePathForm", () => {
  it("renders all four grouped sections, character counters, cover picker and live preview in create mode", () => {
    const html = renderToStaticMarkup(<CreatePathForm />);

    expect(html).toContain("1. Thông tin cơ bản");
    expect(html).toContain("2. Phân loại và độ khó");
    expect(html).toContain("3. Hình ảnh và diện mạo");
    expect(html).toContain("4. Cấu hình học tập");
    expect(html).toContain("0/100");
    expect(html).toContain('role="switch"');
    expect(html).toContain("Xem trước hiển thị");
    expect(html).toContain("Tạo lộ trình");
  });

  it("renders pre-filled fields and points to overview settings in edit mode", () => {
    const html = renderToStaticMarkup(
      <CreatePathForm
        path={{
          id: "path-1",
          slug: "cpp-nhap-mon",
          title: "C++ Nhập môn",
          description: "Lộ trình thực hành cơ bản.",
          difficulty: "EASY",
          tags: ["C++", "nhập môn"],
          estimatedMinutes: 120,
          coverTheme: "green",
        }}
      />,
    );

    expect(html).toContain("C++ Nhập môn");
    expect(html).toContain("Lưu thay đổi");
    expect(html).toContain('href="/gv/paths/cpp-nhap-mon"');
    expect(html).not.toContain('name="sequentialUnlock"');
  });
});

describe("PathPublication & PathUnlockSetting", () => {
  it("renders publish readiness guidance when draft has zero rooms", () => {
    const html = renderToStaticMarkup(
      <PathPublication pathId="path-1" published={false} roomCount={0} />,
    );

    expect(html).toContain("Bản nháp");
    expect(html).toContain("Thêm ít nhất 1 bài học có nội dung");
    expect(html).toContain("Xuất bản lộ trình");
  });

  it("renders accessible switch control for sequential unlock", () => {
    const html = renderToStaticMarkup(
      <PathUnlockSetting pathId="path-1" initialEnabled={true} />,
    );

    expect(html).toContain('role="switch"');
    expect(html).toContain("Mở khóa bài học tuần tự");
  });
});
