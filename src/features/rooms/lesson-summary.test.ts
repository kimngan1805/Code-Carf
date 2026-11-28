import { describe, expect, it } from "vitest";
import { lessonSkeleton } from "@/features/paths/lesson-structure";
import { insertLessonVideo } from "./lesson-video";
import { listLessonVideos, summarizeContent } from "./lesson-summary";

describe("listLessonVideos", () => {
  it("lists videos in order with the caption written under each link", () => {
    const content = [
      "# Bài",
      "https://www.youtube.com/watch?v=ubPxYhz1wvU",
      "_HowKteam · Bài 42_",
      "Đoạn chữ https://youtu.be/Wts7tzAkyQo nằm giữa câu thì không phải video",
      "https://youtu.be/Wts7tzAkyQo",
      "## Khái niệm",
    ].join("\n\n");
    expect(listLessonVideos(content)).toEqual([
      { id: "ubPxYhz1wvU", caption: "HowKteam · Bài 42" },
      { id: "Wts7tzAkyQo", caption: "" },
    ]);
  });

  it("reads back the caption the add-video dialog writes, and skips duplicates", () => {
    const first = insertLessonVideo(
      "# Bài",
      "https://youtu.be/ubPxYhz1wvU",
      "Con_trỏ *cơ bản*",
    );
    if (!first.ok) throw new Error(first.reason);
    expect(
      listLessonVideos(`${first.content}\n\nhttps://youtu.be/ubPxYhz1wvU`),
    ).toEqual([{ id: "ubPxYhz1wvU", caption: "Con_trỏ *cơ bản*" }]);
  });
});

describe("summarizeContent", () => {
  it("says when there is no text", () => {
    expect(summarizeContent(" \n ")).toBe("Chưa có nội dung chữ");
  });

  it("says when only the untouched template is there", () => {
    expect(summarizeContent(lessonSkeleton("Con trỏ"))).toBe(
      "Mới có khung mẫu, chưa nhập nội dung",
    );
  });

  it("counts sections, videos and characters", () => {
    // Chỉ đếm mục đã điền: Khái niệm, Đặc điểm và Luyện tập (video nối vào cuối nằm ở mục này).
    const content = lessonSkeleton("Con trỏ")
      .replace("_Kiến thức này là gì?_", "Con trỏ lưu địa chỉ.")
      .replace("_Có những đặc điểm gì?_", "Có kiểu dữ liệu.")
      .concat("\n\nhttps://youtu.be/ubPxYhz1wvU");
    expect(summarizeContent(content)).toMatch(
      /^3 mục · 1 video · [\d.]+ ký tự$/,
    );
  });
});
