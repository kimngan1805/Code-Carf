import { SubmissionStatus } from "@prisma/client";
import { AppError } from "@/lib/errors";
import { detectFileType } from "@/features/teacher-application/rules";

export const MAX_HANDWRITTEN_IMAGE_BYTES = 5 * 1024 * 1024;
/** Multipart framing adds a little to the file itself; reject bigger requests before parsing them. */
export const MAX_HANDWRITTEN_REQUEST_BYTES =
  MAX_HANDWRITTEN_IMAGE_BYTES + 256 * 1024;

export const HANDWRITTEN_ACCEPT = "image/jpeg,image/png,image/webp";
const ALLOWED_MIME = new Set(HANDWRITTEN_ACCEPT.split(","));

export interface UploadedImage {
  name: string;
  bytes: Uint8Array;
}

export interface ValidImage {
  mime: string;
  ext: string;
}

/**
 * Checks size and real file type. The browser-provided type and file name are
 * not trusted: the type comes from the file's first bytes. Throws a 400 (or 413
 * when too large) with a message the learner can act on.
 */
export function validateHandwrittenImage(file: UploadedImage): ValidImage {
  if (file.bytes.length === 0)
    throw new AppError(
      400,
      "EMPTY_IMAGE",
      "Tệp ảnh trống, hãy chọn lại ảnh bài làm.",
    );
  if (file.bytes.length > MAX_HANDWRITTEN_IMAGE_BYTES)
    throw new AppError(
      413,
      "IMAGE_TOO_LARGE",
      "Ảnh lớn hơn 5 MB, hãy chụp lại hoặc giảm dung lượng ảnh.",
    );
  const type = detectFileType(file.bytes);
  if (!type || !ALLOWED_MIME.has(type.mime))
    throw new AppError(
      400,
      "INVALID_IMAGE_TYPE",
      "Chỉ nhận ảnh JPG, PNG hoặc WebP.",
    );
  return type;
}

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function mimeFromStorageKey(key: string): string {
  return MIME_BY_EXT[key.split(".").pop() ?? ""] ?? "application/octet-stream";
}

/** Once a grader has decided, the image is the evidence for that grade and must not change. */
export function isFinalStatus(status: SubmissionStatus): boolean {
  return (
    status === SubmissionStatus.ACCEPTED || status === SubmissionStatus.REJECTED
  );
}
