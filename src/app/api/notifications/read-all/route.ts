import { assertSameOrigin } from "@/features/contests/http";
import { markAllMyNotificationsRead } from "@/features/notifications/service";
import { fail, ok } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const response = ok(await markAllMyNotificationsRead());
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    const response = fail(error);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}
