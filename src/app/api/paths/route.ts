import { getPaths } from "@/features/paths/service";
import { fail, ok } from "@/lib/api-response";
import { revalidatePath } from "next/cache";
import { assertSameOrigin } from "@/features/contests/http";
import { createManagedPath } from "@/features/paths/creation";
import { AppError } from "@/lib/errors";
export async function GET() {
  try {
    return ok(await getPaths());
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const text = await request.text();
    if (text.length > 40_000)
      throw new AppError(413, "PATH_TOO_LARGE", "Thông tin lộ trình quá lớn.");
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      throw new AppError(400, "INVALID_JSON", "Dữ liệu không hợp lệ.");
    }
    const path = await createManagedPath(body);
    revalidatePath("/gv/paths");
    return ok(path, 201);
  } catch (error) {
    return fail(error);
  }
}
