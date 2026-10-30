import { finalizeContest } from "@/features/contests/deadline";
import { assertSameOrigin } from "@/features/contests/http";
import { fail, ok } from "@/lib/api-response";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    assertSameOrigin(request);
    // No code is read here: only the last draft accepted before the deadline is eligible.
    const response = ok(await finalizeContest((await params).slug));
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    return fail(error);
  }
}
