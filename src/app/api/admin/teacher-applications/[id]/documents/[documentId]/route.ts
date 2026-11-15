import { readApplicationDocument } from "@/features/teacher-application/service";
import { fail } from "@/lib/api-response";

/** Streams an evidence file to an admin. Files are never served from a public path. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> },
) {
  try {
    const { id, documentId } = await params;
    const { document, bytes } = await readApplicationDocument(id, documentId);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(document.fileName)}`,
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return fail(error);
  }
}
