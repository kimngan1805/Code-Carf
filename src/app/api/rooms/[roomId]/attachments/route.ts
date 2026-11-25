import { revalidatePath } from "next/cache";
import { assertSameOrigin } from "@/features/contests/http";
import {
  MAX_ATTACHMENT_LABEL,
  MAX_ATTACHMENT_REQUEST_BYTES,
} from "@/features/rooms/attachment-rules";
import { uploadRoomAttachment } from "@/features/rooms/attachments";
import { fail, ok } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

const TOO_LARGE = () =>
  new AppError(
    413,
    "ATTACHMENT_TOO_LARGE",
    `Tệp lớn hơn ${MAX_ATTACHMENT_LABEL}, hãy nén hoặc tách nhỏ tài liệu.`,
  );

/** Multipart upload of one lecture file (`file`) for a lesson the teacher manages. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  try {
    assertSameOrigin(request);
    // Refuse oversized bodies before they are buffered; the service checks the real size again.
    const declared = Number(request.headers.get("content-length"));
    if (declared > MAX_ATTACHMENT_REQUEST_BYTES) throw TOO_LARGE();

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new AppError(
        400,
        "INVALID_UPLOAD",
        "Yêu cầu tải tệp không hợp lệ.",
      );
    }
    const file = form.get("file");
    if (!(file instanceof File))
      throw new AppError(400, "FILE_REQUIRED", "Hãy chọn tệp tài liệu.");
    if (file.size > MAX_ATTACHMENT_REQUEST_BYTES) throw TOO_LARGE();

    const { roomId } = await params;
    const { attachment, slug } = await uploadRoomAttachment({
      roomId,
      file: {
        name: file.name,
        type: file.type,
        bytes: new Uint8Array(await file.arrayBuffer()),
      },
    });
    revalidatePath(`/gv/paths/${slug}/rooms/${roomId}`);
    revalidatePath(`/hv/rooms/${roomId}`);
    return ok(attachment, 201);
  } catch (error) {
    return fail(error);
  }
}
