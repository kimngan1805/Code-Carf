import { readLibraryFile } from "@/features/library/service";
import { contentDisposition } from "@/features/rooms/attachment-rules";
import { fail } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** Streams a library file to its owner. PDFs open in the page unless `?download=1`. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  try {
    const { fileId } = await params;
    const { bytes, fileName, contentType } = await readLibraryFile(fileId);
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
