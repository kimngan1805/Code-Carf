import { AppError } from "@/lib/errors";

/** Rules for lecture files teachers attach to a lesson. Pure, so the editor can reuse the limits. */
export const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
export const MAX_ATTACHMENT_LABEL = "20 MB";
/** Multipart framing adds a little to the file itself; reject bigger requests before parsing them. */
export const MAX_ATTACHMENT_REQUEST_BYTES = MAX_ATTACHMENT_BYTES + 256 * 1024;
export const MAX_ATTACHMENTS_PER_ROOM = 20;
const MAX_FILE_NAME_LENGTH = 150;

export const ATTACHMENT_TYPES = {
  pdf: { mime: "application/pdf", label: "PDF" },
  pptx: {
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    label: "PowerPoint",
  },
  docx: {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    label: "Word",
  },
} as const;
export type AttachmentExt = keyof typeof ATTACHMENT_TYPES;

export const ATTACHMENT_ACCEPT = [
  ...Object.keys(ATTACHMENT_TYPES).map((ext) => `.${ext}`),
  ...Object.values(ATTACHMENT_TYPES).map((type) => type.mime),
].join(",");

/** Browsers send an empty or generic type when the OS does not know the extension (common for .pptx). */
const GENERIC_MIME = new Set(["", "application/octet-stream"]);

export interface UploadedAttachment {
  name: string;
  /** The type the browser declared. Checked, but never stored or trusted on its own. */
  type: string;
  bytes: Uint8Array;
}

export interface ValidAttachment {
  ext: AttachmentExt;
  mime: string;
  fileName: string;
}

const INVALID_TYPE = () =>
  new AppError(
    400,
    "INVALID_ATTACHMENT_TYPE",
    "Chỉ nhận tài liệu PDF, PowerPoint (.pptx) hoặc Word (.docx).",
  );

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot + 1).toLowerCase();
}

function isAttachmentExt(ext: string): ext is AttachmentExt {
  return Object.hasOwn(ATTACHMENT_TYPES, ext);
}

/** The display name: no folders, control characters or quotes, and short enough for a header. */
export function cleanFileName(name: string, ext: AttachmentExt): string {
  const base = (name.split(/[\\/]/).pop() ?? "")
    .replace(/[\u0000-\u001f\u007f"]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const stem = base.slice(0, base.length - ext.length - 1).trim();
  const cut = stem.slice(0, MAX_FILE_NAME_LENGTH - ext.length - 1).trim();
  return `${cut || "tai-lieu"}.${ext}`;
}

/** Byte search without Buffer, so the editor can import this file too. */
function contains(bytes: Uint8Array, text: string) {
  const needle = Array.from(text, (char) => char.charCodeAt(0));
  let at = bytes.indexOf(needle[0]);
  while (at >= 0 && at + needle.length <= bytes.length) {
    if (needle.every((value, index) => bytes[at + index] === value))
      return true;
    at = bytes.indexOf(needle[0], at + 1);
  }
  return false;
}

/** True when the bytes really are the claimed format, whatever the name and declared type say. */
export function matchesSignature(bytes: Uint8Array, ext: AttachmentExt) {
  if (ext === "pdf")
    return String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
  // Office Open XML files are ZIP archives; entry names are stored uncompressed.
  const isZip =
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04;
  if (!isZip || !contains(bytes, "[Content_Types].xml")) return false;
  // Macro-enabled documents renamed to .pptx/.docx are refused.
  if (contains(bytes, "vbaProject.bin")) return false;
  return contains(
    bytes,
    ext === "pptx" ? "ppt/presentation.xml" : "word/document.xml",
  );
}

/**
 * Checks size, extension, declared MIME type and real content. Throws a 400 (or
 * 413 when too large) with a message the teacher can act on.
 */
export function validateAttachment(file: UploadedAttachment): ValidAttachment {
  if (file.bytes.length === 0)
    throw new AppError(400, "EMPTY_ATTACHMENT", "Tệp trống, hãy chọn lại tệp.");
  if (file.bytes.length > MAX_ATTACHMENT_BYTES)
    throw new AppError(
      413,
      "ATTACHMENT_TOO_LARGE",
      `Tệp lớn hơn ${MAX_ATTACHMENT_LABEL}, hãy nén hoặc tách nhỏ tài liệu.`,
    );
  const ext = extensionOf(file.name);
  if (!isAttachmentExt(ext)) throw INVALID_TYPE();
  const { mime, label } = ATTACHMENT_TYPES[ext];
  const declared = file.type.split(";")[0].trim().toLowerCase();
  if (declared !== mime && !GENERIC_MIME.has(declared)) throw INVALID_TYPE();
  if (!matchesSignature(file.bytes, ext))
    throw new AppError(
      400,
      "ATTACHMENT_CONTENT_MISMATCH",
      `Nội dung tệp không phải tài liệu ${label} hợp lệ.`,
    );
  return { ext, mime, fileName: cleanFileName(file.name, ext) };
}

export function attachmentExt(contentType: string): AttachmentExt | null {
  const entry = Object.entries(ATTACHMENT_TYPES).find(
    ([, type]) => type.mime === contentType,
  );
  return entry ? (entry[0] as AttachmentExt) : null;
}

/** `inline` lets the browser show a PDF in the page; everything else downloads. */
export function contentDisposition(
  fileName: string,
  disposition: "inline" | "attachment",
) {
  const ascii =
    fileName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/[^\x20-\x7e]/g, "_")
      .replace(/["\\]/g, "_") || "tai-lieu";
  return `${disposition}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
