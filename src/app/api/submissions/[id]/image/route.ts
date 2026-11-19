import { readHandwrittenImage } from "@/features/handwritten/service";
import { fail } from "@/lib/api-response";

/** Streams a handwritten answer to the learner who uploaded it. Files are never served from a public path. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { bytes, mime } = await readHandwrittenImage(id);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": mime,
        "Content-Disposition": "inline",
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return fail(error);
  }
}
