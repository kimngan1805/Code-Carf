import { describe, expect, it } from "vitest";
import {
  buildPathListHref,
  CATALOG_PATHS_PAGE_SIZE,
  computePagination,
  getVisiblePageNumbers,
  MANAGED_PATHS_PAGE_SIZE,
  normalizePageSize,
  parsePathPage,
} from "./pagination";

describe("parsePathPage", () => {
  it("parses valid positive integer page numbers from numbers, strings and arrays", () => {
    expect(parsePathPage(1)).toBe(1);
    expect(parsePathPage(3)).toBe(3);
    expect(parsePathPage("2")).toBe(2);
    expect(parsePathPage(" 12 ")).toBe(12);
    expect(parsePathPage(["4", "9"])).toBe(4);
  });

  it.each([
    undefined,
    null,
    "",
    "   ",
    "0",
    "-2",
    "1.5",
    "2abc",
    "abc",
    0,
    -5,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
  ])("defaults invalid page value %j to 1", (value) => {
    expect(parsePathPage(value)).toBe(1);
  });
});

describe("computePagination", () => {
  it("uses 9 items per page by default for both teacher management and student catalog", () => {
    expect(MANAGED_PATHS_PAGE_SIZE).toBe(9);
    expect(CATALOG_PATHS_PAGE_SIZE).toBe(9);
  });

  it("computes totalPages, page, and skip accurately", () => {
    expect(computePagination(1, 25, 9)).toEqual({
      page: 1,
      pageSize: 9,
      totalItems: 25,
      totalPages: 3,
      skip: 0,
    });
    expect(computePagination("2", 25, 9)).toEqual({
      page: 2,
      pageSize: 9,
      totalItems: 25,
      totalPages: 3,
      skip: 9,
    });
    expect(computePagination("3", 25, 9)).toEqual({
      page: 3,
      pageSize: 9,
      totalItems: 25,
      totalPages: 3,
      skip: 18,
    });
  });

  it("clamps pages beyond totalPages to the last available page", () => {
    expect(computePagination(99, 25, 9)).toEqual({
      page: 3,
      pageSize: 9,
      totalItems: 25,
      totalPages: 3,
      skip: 18,
    });
  });

  it("handles empty lists safely with page 1 and totalPages 1", () => {
    expect(computePagination(5, 0, MANAGED_PATHS_PAGE_SIZE)).toEqual({
      page: 1,
      pageSize: MANAGED_PATHS_PAGE_SIZE,
      totalItems: 0,
      totalPages: 1,
      skip: 0,
    });
  });

  it("normalizes invalid page sizes to the fallback", () => {
    expect(normalizePageSize(0, CATALOG_PATHS_PAGE_SIZE)).toBe(
      CATALOG_PATHS_PAGE_SIZE,
    );
    expect(normalizePageSize(100, CATALOG_PATHS_PAGE_SIZE)).toBe(
      CATALOG_PATHS_PAGE_SIZE,
    );
    expect(normalizePageSize(12, CATALOG_PATHS_PAGE_SIZE)).toBe(12);
  });
});

describe("getVisiblePageNumbers", () => {
  it("returns every page when totalPages <= 7", () => {
    expect(getVisiblePageNumbers(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(getVisiblePageNumbers(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("inserts ellipses cleanly for large page counts", () => {
    expect(getVisiblePageNumbers(1, 10)).toEqual([1, 2, "ellipsis", 10]);
    expect(getVisiblePageNumbers(5, 10)).toEqual([
      1,
      "ellipsis",
      4,
      5,
      6,
      "ellipsis",
      10,
    ]);
    expect(getVisiblePageNumbers(10, 10)).toEqual([1, "ellipsis", 9, 10]);
  });
});

describe("buildPathListHref", () => {
  it("omits page=1 for clean URLs and adds page for page > 1", () => {
    expect(buildPathListHref("/gv/paths", 1)).toBe("/gv/paths");
    expect(buildPathListHref("/gv/paths", 2)).toBe("/gv/paths?page=2");
  });

  it("preserves active catalog filter params when switching pages", () => {
    expect(
      buildPathListHref("/hv/paths", 2, {
        q: "cpp",
        difficulty: "MEDIUM",
        tag: "C++",
        sort: "popular",
      }),
    ).toBe("/hv/paths?q=cpp&difficulty=MEDIUM&tag=C%2B%2B&sort=popular&page=2");

    expect(
      buildPathListHref("/hv/paths", 1, {
        q: "cpp",
        difficulty: undefined,
        tag: "C++",
        sort: undefined,
      }),
    ).toBe("/hv/paths?q=cpp&tag=C%2B%2B");
  });
});
