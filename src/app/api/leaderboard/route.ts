import { getLeaderboard } from "@/features/leaderboard/service";
import { fail, ok } from "@/lib/api-response";
export async function GET() {
  try {
    return ok(await getLeaderboard());
  } catch (error) {
    return fail(error);
  }
}
