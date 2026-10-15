import { AppError } from "@/lib/errors";

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    throw new AppError(403, "INVALID_ORIGIN", "Yêu cầu không hợp lệ.");
  }
}
