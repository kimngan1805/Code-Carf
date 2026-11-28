import { describe, expect, it } from "vitest";
import {
  ATTACHMENT_TYPES,
  MAX_ATTACHMENT_BYTES,
  cleanFileName,
  contentDisposition,
  validateAttachment,
} from "./attachment-rules";
import { AppError } from "@/lib/errors";

const encode = (text: string) => new TextEncoder().encode(text);
const pdfBytes = () => encode("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF");
/** Enough of an Office Open XML zip for the signature check: local header plus entry names. */
const officeBytes = (part: string, extra = "") =>
  new Uint8Array([
    0x50,
    0x4b,
    0x03,
    0x04,
    ...encode(`....[Content_Types].xml....${part}....${extra}`),
  ]);
const pptxBytes = () => officeBytes("ppt/presentation.xml");
const docxBytes = () => officeBytes("word/document.xml");

function codeOf(run: () => unknown) {
  try {
    run();
  } catch (error) {
    if (error instanceof AppError) return error.code;
    throw error;
  }
  return null;
}

describe("validateAttachment", () => {
  it("accepts PDF, PPTX and DOCX and stores the canonical MIME type", () => {
    expect(
      validateAttachment({
        name: "Bai 1.pdf",
        type: "application/pdf",
        bytes: pdfBytes(),
      }),
    ).toEqual({
      ext: "pdf",
      mime: "application/pdf",
      fileName: "Bai 1.pdf",
    });
    expect(
      validateAttachment({
        name: "Slide.PPTX",
        type: ATTACHMENT_TYPES.pptx.mime,
        bytes: pptxBytes(),
      }),
    ).toMatchObject({ ext: "pptx", mime: ATTACHMENT_TYPES.pptx.mime });
    expect(
      validateAttachment({
        name: "de-cuong.docx",
        type: ATTACHMENT_TYPES.docx.mime,
        bytes: docxBytes(),
      }),
    ).toMatchObject({ ext: "docx", mime: ATTACHMENT_TYPES.docx.mime });
  });

  it("accepts an empty or generic browser type when the content matches", () => {
    for (const type of ["", "application/octet-stream"])
      expect(
        validateAttachment({ name: "slide.pptx", type, bytes: pptxBytes() })
          .ext,
      ).toBe("pptx");
  });

  it("rejects other extensions, even with valid content", () => {
    for (const name of [
      "slide.ppt",
      "anh.png",
      "script.html",
      "noext",
      "a.pdf.exe",
    ])
      expect(
        codeOf(() => validateAttachment({ name, type: "", bytes: pdfBytes() })),
      ).toBe("INVALID_ATTACHMENT_TYPE");
  });

  it("rejects a declared MIME type that does not match the extension", () => {
    expect(
      codeOf(() =>
        validateAttachment({
          name: "bai.pdf",
          type: "text/html",
          bytes: pdfBytes(),
        }),
      ),
    ).toBe("INVALID_ATTACHMENT_TYPE");
    expect(
      codeOf(() =>
        validateAttachment({
          name: "slide.pptx",
          type: "application/pdf",
          bytes: pptxBytes(),
        }),
      ),
    ).toBe("INVALID_ATTACHMENT_TYPE");
  });

  it("rejects content that is not really the named format", () => {
    const cases = [
      { name: "bai.pdf", bytes: encode("<html><script>alert(1)</script>") },
      { name: "slide.pptx", bytes: pdfBytes() },
      { name: "slide.pptx", bytes: docxBytes() },
      { name: "de.docx", bytes: pptxBytes() },
      {
        name: "macro.pptx",
        bytes: officeBytes("ppt/presentation.xml", "ppt/vbaProject.bin"),
      },
    ];
    for (const file of cases)
      expect(codeOf(() => validateAttachment({ ...file, type: "" }))).toBe(
        "ATTACHMENT_CONTENT_MISMATCH",
      );
  });

  it("rejects empty and oversized files", () => {
    expect(
      codeOf(() =>
        validateAttachment({
          name: "a.pdf",
          type: "",
          bytes: new Uint8Array(),
        }),
      ),
    ).toBe("EMPTY_ATTACHMENT");
    const big = new Uint8Array(MAX_ATTACHMENT_BYTES + 1);
    big.set(pdfBytes());
    expect(
      codeOf(() => validateAttachment({ name: "a.pdf", type: "", bytes: big })),
    ).toBe("ATTACHMENT_TOO_LARGE");
  });
});

describe("cleanFileName", () => {
  it("drops folders, control characters and quotes and keeps the extension", () => {
    expect(cleanFileName('C:\\Users\\gv\\Bài "1"\u0007.PDF', "pdf")).toBe(
      "Bài 1.pdf",
    );
    expect(cleanFileName("../../etc/.pdf", "pdf")).toBe("tai-lieu.pdf");
    expect(cleanFileName(`${"a".repeat(300)}.pptx`, "pptx")).toHaveLength(150);
  });
});

describe("contentDisposition", () => {
  it("keeps the Vietnamese name and an ASCII fallback", () => {
    expect(contentDisposition("Bài giảng đầu.pdf", "inline")).toBe(
      `inline; filename="Bai giang dau.pdf"; filename*=UTF-8''${encodeURIComponent("Bài giảng đầu.pdf")}`,
    );
  });
});
