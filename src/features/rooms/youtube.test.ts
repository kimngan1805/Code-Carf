import { describe, expect, it } from "vitest";
import { youtubeVideoId } from "./youtube";

describe("youtubeVideoId", () => {
  it("reads the id from common YouTube links", () => {
    expect(
      youtubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10"),
    ).toBe("dQw4w9WgXcQ");
    expect(youtubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
  });

  it("rejects other hosts, plain http and malformed ids", () => {
    expect(youtubeVideoId("https://evil.com/watch?v=dQw4w9WgXcQ")).toBeNull();
    expect(youtubeVideoId("http://youtu.be/dQw4w9WgXcQ")).toBeNull();
    expect(youtubeVideoId('https://youtu.be/abc"><script>')).toBeNull();
    expect(youtubeVideoId("not a url")).toBeNull();
  });
});
