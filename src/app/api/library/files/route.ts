import { revalidatePath } from "next/cache";
import { assertSameOrigin } from "@/features/contests/http";
import { uploadLibraryFile } from "@/features/library/service";
import {
  MAX_ATTACHMENT_LABEL,
  MAX_ATTACHMENT_REQUEST_BYTES,
} from "@/features/rooms/attachment-rules";
import { fail, ok } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

const TOO_LARGE = () =>
  new AppError(
    413,
    "ATTACHMENT_TOO_LARGE",
    `Tệp lớn hơn ${MAX_ATTACHMENT_LABEL}, hãy nén hoặc tách nhỏ tài liệu.`,
  );

/** Multipart upload of one lecture file (`file`) straight into the teacher's library. */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
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
    const category = form.get("categoryId");
    const saved = await uploadLibraryFile(
      {
        name: file.name,
        type: file.type,
        bytes: new Uint8Array(await file.arrayBuffer()),
      },
      {
        categoryId: typeof category === "string" && category ? category : null,
      },
    );
    revalidatePath("/gv/library");
    return ok(saved, 201);
  } catch (error) {
    return fail(error);
  }
}
