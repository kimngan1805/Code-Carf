import { describe, expect, it } from "vitest";
import { formatDuration, formatPostedAt } from "./format";

const now = new Date("2026-11-16T12:00:00Z");
const daysAgo = (days: number) =>
  new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

describe("formatPostedAt", () => {
  it.each([
    [0, "Hôm nay"],
    [1, "Hôm qua"],
    [3, "3 ngày trước"],
    [7, "1 tuần trước"],
    [20, "2 tuần trước"],
    [45, "1 tháng trước"],
    [400, "1 năm trước"],
  ])("formats %i days ago", (days, text) => {
    expect(formatPostedAt(daysAgo(days), now)).toBe(text);
  });

  it("returns nothing when the path has no publication date", () => {
    expect(formatPostedAt(null, now)).toBe("");
  });
});

describe("formatDuration", () => {
  it("formats minutes and hours", () => {
    expect(formatDuration(45)).toBe("45 phút");
    expect(formatDuration(720)).toBe("12 giờ");
    expect(formatDuration(90)).toBe("1.5 giờ");
    expect(formatDuration(null)).toBe("");
  });
});
