import { assertSameOrigin } from "@/features/contests/http";
import { changeViolationThreshold } from "@/features/proctoring/management";
import { AppError } from "@/lib/errors";
import { fail, ok } from "@/lib/api-response";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    assertSameOrigin(request);
    const text = await request.text();
    if (text.length > 1024)
      throw new AppError(413, "SETTINGS_TOO_LARGE", "Dữ liệu quá lớn.");
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      throw new AppError(400, "INVALID_JSON", "Dữ liệu không hợp lệ.");
    }
    return ok(await changeViolationThreshold((await params).slug, body));
  } catch (error) {
    return fail(error);
  }
}
