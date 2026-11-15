import { describe, expect, it } from "vitest";
import { hasActiveFilters, parseCatalogFilters } from "./catalog-filters";

describe("parseCatalogFilters", () => {
  it("defaults to newest with no filters", () => {
    const filters = parseCatalogFilters({});
    expect(filters).toEqual({ sort: "newest" });
    expect(hasActiveFilters(filters)).toBe(false);
  });

  it("reads and trims search, tag, difficulty and sort", () => {
    const filters = parseCatalogFilters({
      q: "  cpp  ",
      tag: " C++ ",
      difficulty: "MEDIUM",
      sort: "popular",
    });
    expect(filters).toEqual({
      q: "cpp",
      tag: "C++",
      difficulty: "MEDIUM",
      sort: "popular",
    });
    expect(hasActiveFilters(filters)).toBe(true);
  });

  it("ignores unknown values instead of failing", () => {
    expect(
      parseCatalogFilters({ difficulty: "EXTREME", sort: "random", q: "  " }),
    ).toEqual({ sort: "newest" });
  });

  it("uses the first value of a repeated parameter and caps lengths", () => {
    const filters = parseCatalogFilters({
      q: ["x".repeat(500), "second"],
      tag: "y".repeat(100),
    });
    expect(filters.q).toHaveLength(100);
    expect(filters.tag).toHaveLength(24);
  });
});
