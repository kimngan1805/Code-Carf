import { TeachingLevel } from "@prisma/client";
import { z } from "zod";
import { isProvince } from "./provinces";

export const REVIEW_TIME = "3–5 ngày làm việc";

export const MAX_DOCUMENTS = 3;
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

export const teachingLevelOptions = [
  {
    value: TeachingLevel.HIGH_SCHOOL,
    label: "Trung học phổ thông",
    hint: "Giáo viên THPT (cấp 3)",
  },
  {
    value: TeachingLevel.COLLEGE,
    label: "Cao đẳng",
    hint: "Giảng viên trường cao đẳng",
  },
  {
    value: TeachingLevel.UNIVERSITY,
    label: "Đại học",
    hint: "Giảng viên đại học, học viện",
  },
] as const;

export const applicationSchema = z.object({
  teachingLevel: z.enum(TeachingLevel, "Hãy chọn cấp giảng dạy"),
  province: z
    .string()
    .refine(isProvince, "Hãy chọn tỉnh/thành trong danh sách"),
  schoolId: z.string().trim().min(1).optional(),
  schoolName: z
    .string()
    .trim()
    .min(3, "Tên trường quá ngắn")
    .max(200, "Tên trường quá dài"),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;

const SIGNATURES: {
  mime: string;
  ext: string;
  matches: (b: Uint8Array) => boolean;
}[] = [
  {
    mime: "image/jpeg",
    ext: "jpg",
    matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: "image/png",
    ext: "png",
    matches: (b) =>
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
        (v, i) => b[i] === v,
      ),
  },
  {
    mime: "image/webp",
    ext: "webp",
    matches: (b) =>
      String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...b.slice(8, 12)) === "WEBP",
  },
  {
    mime: "application/pdf",
    ext: "pdf",
    matches: (b) => String.fromCharCode(...b.slice(0, 5)) === "%PDF-",
  },
];

/** Detects the real file type from its first bytes; the browser-provided type is not trusted. */
export function detectFileType(
  bytes: Uint8Array,
): { mime: string; ext: string } | null {
  const match = SIGNATURES.find((signature) => signature.matches(bytes));
  return match ? { mime: match.mime, ext: match.ext } : null;
}

export interface UploadedDocument {
  name: string;
  size: number;
  bytes: Uint8Array;
}

/** Returns an error message, or null when the documents are acceptable. */
export function validateDocuments(files: UploadedDocument[]): string | null {
  if (files.length === 0) return "Hãy tải lên ít nhất một minh chứng.";
  if (files.length > MAX_DOCUMENTS)
    return `Chỉ được tải tối đa ${MAX_DOCUMENTS} tệp.`;
  for (const file of files) {
    if (file.size > MAX_DOCUMENT_BYTES) return `"${file.name}" lớn hơn 5 MB.`;
    if (!detectFileType(file.bytes))
      return `"${file.name}" không phải ảnh (JPG, PNG, WEBP) hoặc PDF.`;
  }
  return null;
}
