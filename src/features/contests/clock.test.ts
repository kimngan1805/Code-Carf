import { describe, expect, it, vi } from "vitest";
import { draftKey, estimateServerTime } from "./clock";

describe("server clock and draft identity", () => {
  it("ignores changes to the device wall clock", () => {
    const clock = vi.spyOn(Date, "now").mockReturnValue(0);
    try {
      expect(estimateServerTime(100000, 500, 1500)).toBe(101000);
      clock.mockReturnValue(9999999999999);
      expect(estimateServerTime(100000, 500, 2500)).toBe(102000);
    } finally {
      clock.mockRestore();
    }
  });
  it("resumes from a newly received server time after reload", () => {
    expect(estimateServerTime(120000, 0, 200)).toBe(120200);
    expect(estimateServerTime(100000, 500, 100)).toBe(100000);
  });
  it("isolates drafts between users, contests, exercises, and languages", () => {
    const keys = [
      draftKey("a", "c", "e", "python"),
      draftKey("b", "c", "e", "python"),
      draftKey("a", "d", "e", "python"),
      draftKey("a", "c", "f", "python"),
      draftKey("a", "c", "e", "cpp"),
    ];
    expect(new Set(keys).size).toBe(keys.length);
  });
});
