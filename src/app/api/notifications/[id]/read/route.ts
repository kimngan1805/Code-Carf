import { assertSameOrigin } from "@/features/contests/http";
import { markMyNotificationRead } from "@/features/notifications/service";
import { fail, ok } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const { id } = await params;
    const response = ok(await markMyNotificationRead(id));
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    const response = fail(error);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}
