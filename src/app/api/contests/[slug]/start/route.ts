import { startContest } from "@/features/contests/deadline";
import { assertSameOrigin } from "@/features/contests/http";
import { fail, ok } from "@/lib/api-response";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    assertSameOrigin(request);
    return ok(await startContest((await params).slug));
  } catch (error) {
    return fail(error);
  }
}
