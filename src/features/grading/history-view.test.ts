import { SubmissionStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  HISTORY_PAGE_SIZE,
  formatScore,
  languageLabel,
  paginate,
  parsePage,
  submissionStatusView,
} from "./history-view";

describe("parsePage", () => {
  it("accepts positive integers, as numbers or strings", () => {
    expect(parsePage("3")).toBe(3);
    expect(parsePage(7)).toBe(7);
  });

  it.each([undefined, null, "", "0", "-2", "1.5", "abc", NaN, Infinity, []])(
    "falls back to page 1 for %j",
    (value) => {
      expect(parsePage(value)).toBe(1);
    },
  );
});

describe("paginate", () => {
  it("computes pages and the row offset", () => {
    expect(paginate(1, 25)).toEqual({ page: 1, totalPages: 3, skip: 0 });
    expect(paginate(3, 25)).toEqual({
      page: 3,
      totalPages: 3,
      skip: 2 * HISTORY_PAGE_SIZE,
    });
  });

  it("treats an exact multiple of the page size as full pages, not an extra one", () => {
    expect(paginate(1, 20).totalPages).toBe(2);
  });

  it("clamps a page past the end to the last page", () => {
    expect(paginate(99, 25)).toEqual({ page: 3, totalPages: 3, skip: 20 });
  });

  it("shows one empty page when there is no history", () => {
    expect(paginate(5, 0)).toEqual({ page: 1, totalPages: 1, skip: 0 });
  });
});

describe("submission labels", () => {
  it("has a label and tone for every status", () => {
    for (const status of Object.values(SubmissionStatus))
      expect(submissionStatusView(status).label.length).toBeGreaterThan(0);
    expect(submissionStatusView("ACCEPTED")).toEqual({
      label: "Đạt",
      tone: "pass",
    });
    expect(submissionStatusView("REJECTED").tone).toBe("fail");
  });

  it("formats scores, with a dash while ungraded", () => {
    expect(formatScore(70, 100)).toBe("70/100");
    expect(formatScore(null, 100)).toBe("—/100");
  });

  it("shows a language label and falls back to the raw value", () => {
    expect(languageLabel("cpp")).toBe("C++");
    expect(languageLabel("rust")).toBe("rust");
    expect(languageLabel(null)).toBe("—");
  });
});
