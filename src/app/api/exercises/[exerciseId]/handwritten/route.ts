import { assertSameOrigin } from "@/features/contests/http";
import { MAX_HANDWRITTEN_REQUEST_BYTES } from "@/features/handwritten/rules";
import { uploadHandwrittenImage } from "@/features/handwritten/service";
import { fail, ok } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

const TOO_LARGE = () =>
  new AppError(
    413,
    "IMAGE_TOO_LARGE",
    "Ảnh lớn hơn 5 MB, hãy chụp lại hoặc giảm dung lượng ảnh.",
  );

/** Multipart upload: `image` (required) and `contest` (contest slug, only for a contest attempt). */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ exerciseId: string }> },
) {
  try {
    assertSameOrigin(request);
    // Refuse oversized bodies before they are buffered; the service checks the real size again.
    const declared = Number(request.headers.get("content-length"));
    if (declared > MAX_HANDWRITTEN_REQUEST_BYTES) throw TOO_LARGE();

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new AppError(
        400,
        "INVALID_UPLOAD",
        "Yêu cầu tải ảnh không hợp lệ.",
      );
    }
    const image = form.get("image");
    if (!(image instanceof File))
      throw new AppError(400, "IMAGE_REQUIRED", "Hãy chọn ảnh bài làm.");
    if (image.size > MAX_HANDWRITTEN_REQUEST_BYTES) throw TOO_LARGE();
    const contest = form.get("contest");

    const { exerciseId } = await params;
    const result = await uploadHandwrittenImage({
      exerciseId,
      contestSlug: typeof contest === "string" && contest ? contest : null,
      file: {
        name: image.name,
        bytes: new Uint8Array(await image.arrayBuffer()),
      },
    });
    return ok(
      { id: result.id, submittedAt: result.submittedAt.toISOString() },
      result.replaced ? 200 : 201,
    );
  } catch (error) {
    return fail(error);
  }
}
