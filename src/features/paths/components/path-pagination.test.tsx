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

import { PathPagination } from "./path-pagination";

describe("PathPagination", () => {
  it("renders nothing for empty or single-page lists", () => {
    expect(
      renderToStaticMarkup(
        <PathPagination
          basePath="/gv/paths"
          page={1}
          pageSize={9}
          totalItems={0}
          totalPages={1}
        />,
      ),
    ).toBe("");
    expect(
      renderToStaticMarkup(
        <PathPagination
          basePath="/gv/paths"
          page={1}
          pageSize={9}
          totalItems={5}
          totalPages={1}
        />,
      ),
    ).toBe("");
  });

  it("renders previous, next, active page indicator and range summary on page 1", () => {
    const html = renderToStaticMarkup(
      <PathPagination
        basePath="/gv/paths"
        page={1}
        pageSize={9}
        totalItems={25}
        totalPages={3}
      />,
    );

    expect(html).toContain("Hiển thị 1–9 trên 25 lộ trình · Trang 1 / 3");
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('href="/gv/paths?page=2"');
    expect(html).toContain('href="/gv/paths?page=3"');
    expect(html).toContain('rel="next"');
    expect(html).not.toContain('rel="prev"');
  });

  it("preserves catalog filter query params on previous, next and numbered page links", () => {
    const html = renderToStaticMarkup(
      <PathPagination
        basePath="/hv/paths"
        page={2}
        pageSize={9}
        totalItems={27}
        totalPages={3}
        queryParams={{
          q: "cpp",
          difficulty: "HARD",
          tag: "C++",
          sort: "popular",
        }}
      />,
    );

    expect(html).toContain("Hiển thị 10–18 trên 27 lộ trình · Trang 2 / 3");
    expect(html).toContain(
      'href="/hv/paths?q=cpp&amp;difficulty=HARD&amp;tag=C%2B%2B&amp;sort=popular"',
    );
    expect(html).toContain(
      'href="/hv/paths?q=cpp&amp;difficulty=HARD&amp;tag=C%2B%2B&amp;sort=popular&amp;page=3"',
    );
    expect(html).toContain('rel="prev"');
    expect(html).toContain('rel="next"');
  });

  it("disables next on the last page and renders ellipses for large page counts", () => {
    const html = renderToStaticMarkup(
      <PathPagination
        basePath="/gv/paths"
        page={10}
        pageSize={9}
        totalItems={90}
        totalPages={10}
      />,
    );

    expect(html).toContain("Hiển thị 82–90 trên 90 lộ trình · Trang 10 / 10");
    expect(html).toContain("…");
    expect(html).toContain('rel="prev"');
    expect(html).not.toContain('rel="next"');
  });
});
