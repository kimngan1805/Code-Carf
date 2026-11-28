const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtube-nocookie.com",
]);

/**
 * Mã video từ một link YouTube (watch, youtu.be, embed, shorts), hoặc null.
 * Chỉ nhận mã đúng định dạng 11 ký tự nên không thể chèn gì khác vào iframe.
 */
export function youtubeVideoId(href: string | undefined): string | null {
  if (!href) return null;
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !HOSTS.has(url.hostname)) return null;
  const segments = url.pathname.split("/").filter(Boolean);
  const id =
    url.hostname === "youtu.be"
      ? segments[0]
      : segments[0] === "watch"
        ? url.searchParams.get("v")
        : ["embed", "shorts", "live"].includes(segments[0] ?? "")
          ? segments[1]
          : null;
  return id && VIDEO_ID.test(id) ? id : null;
}
