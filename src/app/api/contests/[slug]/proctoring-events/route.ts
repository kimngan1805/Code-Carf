import { assertSameOrigin } from "@/features/contests/http";
import {
  reportContestEvent,
  getOwnViolationStatus,
} from "@/features/proctoring/service";
import { AppError } from "@/lib/errors";
import { fail, ok } from "@/lib/api-response";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    assertSameOrigin(request);
    const text = await request.text();
    if (text.length > 1024)
      throw new AppError(413, "EVENT_TOO_LARGE", "Sự kiện quá lớn.");
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      throw new AppError(400, "INVALID_JSON", "Dữ liệu không hợp lệ.");
    }
    return ok(await reportContestEvent((await params).slug, body));
  } catch (error) {
    return fail(error);
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    return ok(await getOwnViolationStatus((await params).slug));
  } catch (error) {
    return fail(error);
  }
}
