import { saveContestDraft } from "@/features/contests/deadline";
import { assertSameOrigin } from "@/features/contests/http";
import { fail, ok } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    assertSameOrigin(request);
    const text = await request.text();
    if (text.length > 400000)
      throw new AppError(413, "DRAFT_TOO_LARGE", "Bản nháp quá lớn.");
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      throw new AppError(400, "INVALID_JSON", "Dữ liệu bản nháp không hợp lệ.");
    }
    return ok(await saveContestDraft((await params).slug, body));
  } catch (error) {
    return fail(error);
  }
}
