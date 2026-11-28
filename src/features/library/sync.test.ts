import { describe, expect, it } from "vitest";
import { lessonTag, lessonVideos } from "./sync";

describe("lessonVideos", () => {
  it("reads YouTube links on their own line and the caption right after", () => {
    const content = [
      "## Tổng quan",
      "",
      "https://www.youtube.com/watch?v=6I_ulPytQIc",
      "",
      "_TITV · Lập trình Python 01_",
      "",
      "Xem thêm https://youtu.be/16qD3hRRadc trong câu thì không tính.",
      "https://youtu.be/16qD3hRRadc",
      "## Khái niệm",
    ].join("\n");
    expect(lessonVideos(content)).toEqual([
      { youtubeId: "6I_ulPytQIc", caption: "TITV · Lập trình Python 01" },
      { youtubeId: "16qD3hRRadc", caption: "" },
    ]);
  });
});

describe("lessonTag", () => {
  it("drops parentheses and caps the tag at 30 characters", () => {
    expect(lessonTag("Chuỗi ký tự (String)")).toBe("Chuỗi ký tự");
    expect(
      lessonTag("Vòng lặp while, break và continue").length,
    ).toBeLessThanOrEqual(30);
  });
});
