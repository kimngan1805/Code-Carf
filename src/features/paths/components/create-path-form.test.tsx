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

vi.mock("@/features/rooms/authoring-actions", () => ({
  saveLessonAction: vi.fn(),
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
  it("renders the six sections, outline builder, counters and live preview in create mode", () => {
    const html = renderToStaticMarkup(<CreatePathForm />);

    expect(html).toContain("1. Giới thiệu lộ trình");
    expect(html).toContain("2. Phân loại");
    expect(html).toContain("3. Đề cương và mục tiêu");
    expect(html).toContain("4. Màu bìa");
    expect(html).toContain("5. Ai được xem");
    expect(html).toContain("6. Cấu hình học tập");
    expect(html).toContain("Trang khám phá");
    expect(html).toContain("Thêm bài học");
    // Khung 12 phần là mẫu tùy chọn, mặc định không bật.
    expect(html).toContain("Dùng khung mẫu 12 phần");
    expect(html).toContain("(không bắt buộc)");
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
    expect(html).not.toContain("Đề cương và mục tiêu");
    expect(html).not.toContain("Ai được xem");
    expect(html).toContain("3. Màu bìa");
  });
});

describe("PathPublication & PathUnlockSetting", () => {
  it("renders publish readiness guidance when draft has zero rooms", () => {
    const html = renderToStaticMarkup(
      <PathPublication pathId="path-1" published={false} roomCount={0} />,
    );

    expect(html).toContain("Bản nháp");
    expect(html).toContain("Thêm ít nhất 1 bài học");
    expect(html).toContain("Xuất bản lộ trình");
    expect(html).toContain('disabled=""');
  });

  it("blocks publishing while some lessons have no content, attachment or exercise", () => {
    const html = renderToStaticMarkup(
      <PathPublication
        pathId="path-1"
        published={false}
        roomCount={3}
        emptyLessonCount={2}
      />,
    );
    expect(html).toContain("Còn 2 bài học chưa có nội dung");
    expect(html).toContain('disabled=""');
  });

  it("allows publishing once every lesson has something to learn", () => {
    const html = renderToStaticMarkup(
      <PathPublication
        pathId="path-1"
        published={false}
        roomCount={3}
        emptyLessonCount={0}
      />,
    );
    expect(html).not.toContain('disabled=""');
  });

  it("renders accessible switch control for sequential unlock", () => {
    const html = renderToStaticMarkup(
      <PathUnlockSetting pathId="path-1" initialEnabled={true} />,
    );

    expect(html).toContain('role="switch"');
    expect(html).toContain("Mở khóa bài học tuần tự");
  });
});
