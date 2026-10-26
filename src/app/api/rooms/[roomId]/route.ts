import { getRoom } from "@/features/rooms/service";
import { fail, ok } from "@/lib/api-response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  try {
    const { roomId } = await params;
    return ok(await getRoom(roomId));
  } catch (error) {
    return fail(error);
  }
}
