import { getContestClock } from "@/features/contests/deadline";
import { fail, ok } from "@/lib/api-response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const response = ok(await getContestClock(slug));
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    const response = fail(error);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}
