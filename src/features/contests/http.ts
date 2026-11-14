import { AppError } from "@/lib/errors";

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  // Next can construct request.url with its bind address (for example 0.0.0.0).
  // Compare against the browser-facing Host, as Next's server actions do.
  const host = request.headers.get("host") ?? url.host;
  const protocol =
    request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ??
    url.protocol.slice(0, -1);
  if (origin && origin !== `${protocol}://${host}`) {
    throw new AppError(403, "INVALID_ORIGIN", "Yêu cầu không hợp lệ.");
  }
}
