import { createHash, timingSafeEqual } from "node:crypto";
import { sendUpcomingContestReminders } from "@/features/notifications/writer";
import { fail, ok } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

export const dynamic = "force-dynamic";

function sha256Digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

function assertValidCronSecret(request: Request): void {
  const configured = process.env.CRON_SECRET?.trim();
  if (!configured) {
    throw new AppError(
      500,
      "CRON_NOT_CONFIGURED",
      "CRON_SECRET chưa được cấu hình.",
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const provided = match?.[1]?.trim();

  if (
    !provided ||
    !timingSafeEqual(sha256Digest(provided), sha256Digest(configured))
  ) {
    throw new AppError(401, "UNAUTHORIZED", "Invalid cron secret.");
  }
}

export async function POST(request: Request) {
  try {
    assertValidCronSecret(request);
    const response = ok(await sendUpcomingContestReminders());
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    const response = fail(error);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}
