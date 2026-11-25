import { getMyNotifications } from "@/features/notifications/service";
import { fail, ok } from "@/lib/api-response";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const limit = new URL(request.url).searchParams.get("limit");
    const response = ok(await getMyNotifications(limit));
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    const response = fail(error);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}
