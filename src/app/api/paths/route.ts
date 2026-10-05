import { getPaths } from "@/features/paths/service";
import { fail, ok } from "@/lib/api-response";
export async function GET() {
  try {
    return ok(await getPaths());
  } catch (error) {
    return fail(error);
  }
}
