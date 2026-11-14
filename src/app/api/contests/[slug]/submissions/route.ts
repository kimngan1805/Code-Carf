import { submitContestSolution } from "@/features/contests/workspace";
import { assertSameOrigin } from "@/features/contests/http";
import { AppError } from "@/lib/errors";
import { fail, ok } from "@/lib/api-response";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    assertSameOrigin(request);
    const text = await request.text();
    if (text.length > 110_000)
      throw new AppError(413, "SUBMISSION_TOO_LARGE", "Bài nộp quá lớn.");
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      throw new AppError(400, "INVALID_JSON", "Dữ liệu bài nộp không hợp lệ.");
    }
    const { slug } = await params;
    return ok(await submitContestSolution(slug, body), 201);
  } catch (error) {
    return fail(error);
  }
}
