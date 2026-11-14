import { registerForContest } from "@/features/contests/service";
import { assertSameOrigin } from "@/features/contests/http";
import { fail, ok } from "@/lib/api-response";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    assertSameOrigin(request);
    const { slug } = await params;
    return ok(await registerForContest(slug));
  } catch (error) {
    return fail(error);
  }
}
