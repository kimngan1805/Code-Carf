import { getContestEntry } from "@/features/contests/service";
import { fail, ok } from "@/lib/api-response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const entry = await getContestEntry(slug);
    const response = ok({
      serverNow: entry.serverNow,
      endsAt: entry.contest.endsAt!.toISOString(),
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    const response = fail(error);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}
