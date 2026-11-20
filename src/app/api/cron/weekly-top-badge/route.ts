import {
  authorizeCronRequest,
  runWeeklyTopBadgeJob,
} from "@/features/progress/weekly-top-job";
import { fail, ok } from "@/lib/api-response";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    authorizeCronRequest(request);
    const result = await runWeeklyTopBadgeJob(new Date());
    logger.info("cron.weekly_top_badge_completed", {
      referenceDate: result.referenceDate.toISOString(),
      weeksChecked: result.checkedWeeks.length,
      totalAwardedCount: result.totalAwardedCount,
    });
    const response = ok(result);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    return fail(error);
  }
}
