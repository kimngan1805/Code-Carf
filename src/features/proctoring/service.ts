import { requireRole } from "@/features/auth/service";
import { AppError } from "@/lib/errors";
import { proctoringEventSchema } from "./schema";
import { recordProctoringEvent } from "./repository";

export async function reportContestEvent(slug: string, body: unknown) {
  const user = await requireRole(["STUDENT"]);
  const parsed = proctoringEventSchema.safeParse(body);
  if (!parsed.success)
    throw new AppError(
      400,
      "INVALID_PROCTORING_EVENT",
      "Sự kiện không hợp lệ.",
    );
  return recordProctoringEvent(slug, user.id, parsed.data);
}
