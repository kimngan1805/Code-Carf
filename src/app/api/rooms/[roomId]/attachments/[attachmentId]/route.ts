import { contentDisposition } from "@/features/rooms/attachment-rules";
import { readRoomAttachment } from "@/features/rooms/attachments";
import { fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * Streams a lesson file to someone allowed to open the lesson. PDFs open in the
 * page unless `?download=1`; other formats always download.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string; attachmentId: string }> },
) {
  try {
    const { roomId, attachmentId } = await params;
    const { bytes, fileName, contentType } = await readRoomAttachment(
      roomId,
      attachmentId,
    );
    const download = new URL(request.url).searchParams.has("download");
    const inline = contentType === "application/pdf" && !download;
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentDisposition(
          fileName,
          inline ? "inline" : "attachment",
        ),
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const response = fail(error);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}
