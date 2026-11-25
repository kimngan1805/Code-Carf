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

import {
  buildEnrolledStudentsPageHref,
  EnrolledStudentsSection,
} from "./enrolled-students-section";

describe("EnrolledStudentsSection", () => {
  it("renders a clean empty state without pagination when no learners have enrolled", () => {
    const html = renderToStaticMarkup(
      <EnrolledStudentsSection
        pathSlug="cpp-co-ban"
        pathPublished={true}
        data={{
          items: [],
          totalPublishedRooms: 4,
          page: 1,
          pageSize: 10,
          totalItems: 0,
          totalPages: 1,
        }}
      />,
    );

    expect(html).toContain('id="hoc-vien"');
    expect(html).toContain("Học viên đã đăng ký");
    expect(html).toContain("0 học viên");
    expect(html).toContain("Chưa có học viên nào đăng ký");
    expect(html).not.toContain("<table");
    expect(html).not.toContain("Phân trang danh sách học viên");
  });

  it("renders responsive desktop table, mobile cards, progress bars, statuses and pagination links", () => {
    const html = renderToStaticMarkup(
      <EnrolledStudentsSection
        pathSlug="cpp-co-ban"
        pathPublished={true}
        data={{
          totalPublishedRooms: 4,
          page: 1,
          pageSize: 10,
          totalItems: 12,
          totalPages: 2,
          items: [
            {
              userId: "s-1",
              name: "Nguyễn Minh Anh",
              enrolledAt: new Date("2026-11-24T08:00:00.000Z"),
              completedRooms: 4,
              totalPublishedRooms: 4,
              percent: 100,
              status: "completed",
            },
            {
              userId: "s-2",
              name: "Trần Quốc Bảo",
              enrolledAt: new Date("2026-11-23T08:00:00.000Z"),
              completedRooms: 2,
              totalPublishedRooms: 4,
              percent: 50,
              status: "in_progress",
            },
            {
              userId: "s-3",
              name: "Lê Thu Hà",
              enrolledAt: new Date("2026-11-22T08:00:00.000Z"),
              completedRooms: 0,
              totalPublishedRooms: 4,
              percent: 0,
              status: "not_started",
            },
          ],
        }}
      />,
    );

    expect(html).toContain("12 học viên");
    expect(html).toContain("<table");
    expect(html).toContain("md:hidden");
    expect(html).toContain("Nguyễn Minh Anh");
    expect(html).toContain("NA");
    expect(html).toContain("Hoàn thành");
    expect(html).toContain("100%");
    expect(html).toContain("(4/4)");
    expect(html).toContain("Trần Quốc Bảo");
    expect(html).toContain("Đang học");
    expect(html).toContain("50%");
    expect(html).toContain("Lê Thu Hà");
    expect(html).toContain("Chưa bắt đầu");
    expect(html).toContain('role="progressbar"');
    expect(html).toContain("Hiển thị 1–10 trên 12 học viên · Trang 1 / 2");
    expect(html).toContain(
      'href="/gv/paths/cpp-co-ban?studentsPage=2#hoc-vien"',
    );
    expect(html).toContain('rel="next"');
  });

  it("builds clean pagination URLs anchored to #hoc-vien", () => {
    expect(buildEnrolledStudentsPageHref("cpp-co-ban", 1)).toBe(
      "/gv/paths/cpp-co-ban#hoc-vien",
    );
    expect(buildEnrolledStudentsPageHref("cpp-co-ban", 3)).toBe(
      "/gv/paths/cpp-co-ban?studentsPage=3#hoc-vien",
    );
  });
});
