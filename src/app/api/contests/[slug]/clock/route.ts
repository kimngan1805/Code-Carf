import { getContestClock } from "@/features/contests/deadline";
import { fail, ok } from "@/lib/api-response";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const stage = Number(new URL(request.url).searchParams.get("stage"));
    const response = ok(
      await getContestClock(
        slug,
        Number.isInteger(stage) && stage > 0 ? stage : undefined,
      ),
    );
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    const response = fail(error);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}
