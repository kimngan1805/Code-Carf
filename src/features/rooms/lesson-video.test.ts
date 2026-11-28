import { describe, expect, it } from "vitest";
import { lessonSkeleton } from "@/features/paths/lesson-structure";
import { cleanCaption, insertLessonVideo } from "./lesson-video";

const URL_A = "https://www.youtube.com/watch?v=ubPxYhz1wvU";
const URL_B = "https://youtu.be/Wts7tzAkyQo";

function inserted(content: string, url = URL_A, caption = "") {
  const result = insertLessonVideo(content, url, caption);
  if (!result.ok) throw new Error(result.reason);
  return result.content;
}

describe("insertLessonVideo", () => {
  it("rejects links that are not YouTube videos", () => {
    expect(insertLessonVideo("# Bài", "https://example.com/v.mp4")).toEqual({
      ok: false,
      reason: "INVALID_URL",
    });
    expect(insertLessonVideo("# Bài", "http://youtu.be/Wts7tzAkyQo")).toEqual({
      ok: false,
      reason: "INVALID_URL",
    });
  });

  it("writes the canonical link alone on its line with an optional caption", () => {
    const content = inserted("# Bài", URL_B, "Bài 43: Con trỏ NULL");
    expect(content).toBe(
      "# Bài\n\n## Video bài giảng\n\nhttps://www.youtube.com/watch?v=Wts7tzAkyQo\n\n_Bài 43: Con trỏ NULL_\n",
    );
  });

  it("appends to the end of an existing video section", () => {
    const content = [
      "# Bài",
      "## Tổng quan",
      "Giới thiệu.",
      "### Video bài giảng",
      URL_B,
      "## Khái niệm",
      "Nội dung.",
    ].join("\n\n");
    expect(inserted(content)).toBe(
      [
        "# Bài",
        "## Tổng quan",
        "Giới thiệu.",
        "### Video bài giảng",
        URL_B,
        URL_A,
        "## Khái niệm",
        "Nội dung.",
      ].join("\n\n"),
    );
  });

  it("keeps sub-headings inside the video section", () => {
    const content = [
      "## Video bài giảng",
      "### Phần 1",
      URL_B,
      "## Bài tập",
    ].join("\n\n");
    expect(inserted(content)).toBe(
      ["## Video bài giảng", "### Phần 1", URL_B, URL_A, "## Bài tập"].join(
        "\n\n",
      ),
    );
  });

  it("creates the video section right after the overview of a 12-part skeleton", () => {
    const content = inserted(lessonSkeleton("Con trỏ"), URL_A, "Bài 42");
    const overview = content.indexOf("## Tổng quan");
    const video = content.indexOf("### Video bài giảng");
    const concept = content.indexOf("## Khái niệm");
    expect(overview).toBeGreaterThan(-1);
    expect(video).toBeGreaterThan(overview);
    expect(concept).toBeGreaterThan(video);
    expect(content.slice(video, concept)).toBe(
      `### Video bài giảng\n\n${URL_A}\n\n_Bài 42_\n\n`,
    );
  });

  it("ignores heading-like lines inside code blocks", () => {
    const content = [
      "## Tổng quan",
      "```python\n## Khái niệm (chỉ là chú thích)\nprint(1)\n```",
      "## Khái niệm",
    ].join("\n\n");
    const result = inserted(content);
    expect(result.indexOf("### Video bài giảng")).toBeGreaterThan(
      result.indexOf("```\n"),
    );
    expect(result.indexOf("### Video bài giảng")).toBeLessThan(
      result.lastIndexOf("## Khái niệm"),
    );
  });

  it("does not add the same video twice, whatever link form was used", () => {
    const content = inserted("# Bài", URL_A);
    expect(
      insertLessonVideo(content, "https://youtu.be/ubPxYhz1wvU?t=30"),
    ).toEqual({ ok: false, reason: "DUPLICATE" });
  });

  it("works on an empty lesson", () => {
    expect(inserted("")).toBe(`## Video bài giảng\n\n${URL_A}\n`);
  });

  it("normalises Windows line endings", () => {
    expect(inserted("# Bài\r\n\r\n## Tổng quan\r\n\r\nA")).toBe(
      `# Bài\n\n## Tổng quan\n\nA\n\n### Video bài giảng\n\n${URL_A}\n`,
    );
  });
});

describe("cleanCaption", () => {
  it("keeps the caption on one line and escapes Markdown markers", () => {
    expect(cleanCaption("  Bài 1:\n con_trỏ *cơ bản*  ")).toBe(
      "Bài 1: con\\_trỏ \\*cơ bản\\*",
    );
  });

  it("limits the length", () => {
    expect(cleanCaption("a".repeat(500))).toHaveLength(200);
  });
});
