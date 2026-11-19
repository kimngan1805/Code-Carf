import { describe, expect, it } from "vitest";
import {
  MAX_HANDWRITTEN_IMAGE_BYTES,
  isFinalStatus,
  mimeFromStorageKey,
  validateHandwrittenImage,
} from "./rules";

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG = [0xff, 0xd8, 0xff, 0xe0];
const WEBP = [
  ...Array.from("RIFF", (c) => c.charCodeAt(0)),
  0,
  0,
  0,
  0,
  ...Array.from("WEBP", (c) => c.charCodeAt(0)),
];
const PDF = Array.from("%PDF-1.7", (c) => c.charCodeAt(0));

const file = (head: number[], size = 64, name = "bai-lam.png") => {
  const bytes = new Uint8Array(size);
  bytes.set(head);
  return { name, bytes };
};

describe("validateHandwrittenImage", () => {
  it.each([
    ["JPEG", JPEG, { mime: "image/jpeg", ext: "jpg" }],
    ["PNG", PNG, { mime: "image/png", ext: "png" }],
    ["WebP", WEBP, { mime: "image/webp", ext: "webp" }],
  ])("accepts %s", (_name, head, expected) => {
    expect(validateHandwrittenImage(file(head))).toEqual(expected);
  });

  it("accepts a file of exactly 5 MB", () => {
    expect(
      validateHandwrittenImage(file(PNG, MAX_HANDWRITTEN_IMAGE_BYTES)).mime,
    ).toBe("image/png");
  });

  it("rejects a file over 5 MB with 413 and a clear message", () => {
    expect(() =>
      validateHandwrittenImage(file(PNG, MAX_HANDWRITTEN_IMAGE_BYTES + 1)),
    ).toThrowError(
      expect.objectContaining({ status: 413, code: "IMAGE_TOO_LARGE" }),
    );
  });

  it("rejects an empty file", () => {
    expect(() => validateHandwrittenImage(file([], 0))).toThrowError(
      expect.objectContaining({ status: 400, code: "EMPTY_IMAGE" }),
    );
  });

  it.each([
    ["a PDF, which teacher evidence allows", PDF],
    ["plain text", Array.from("hello", (c) => c.charCodeAt(0))],
    ["a GIF", Array.from("GIF89a", (c) => c.charCodeAt(0))],
  ])("rejects %s", (_name, head) => {
    expect(() => validateHandwrittenImage(file(head))).toThrowError(
      expect.objectContaining({ status: 400, code: "INVALID_IMAGE_TYPE" }),
    );
  });

  it("trusts the bytes, not the file name", () => {
    expect(() =>
      validateHandwrittenImage(file(PDF, 64, "trick.png")),
    ).toThrowError(expect.objectContaining({ code: "INVALID_IMAGE_TYPE" }));
    expect(validateHandwrittenImage(file(JPEG, 64, "photo.txt")).ext).toBe(
      "jpg",
    );
  });
});

describe("helpers", () => {
  it("maps a storage key extension to a content type", () => {
    expect(mimeFromStorageKey("handwritten/u1/a.jpg")).toBe("image/jpeg");
    expect(mimeFromStorageKey("handwritten/u1/a.png")).toBe("image/png");
    expect(mimeFromStorageKey("handwritten/u1/a.webp")).toBe("image/webp");
    expect(mimeFromStorageKey("handwritten/u1/a.exe")).toBe(
      "application/octet-stream",
    );
  });

  it("treats only graded statuses as final", () => {
    expect(isFinalStatus("ACCEPTED")).toBe(true);
    expect(isFinalStatus("REJECTED")).toBe(true);
    expect(isFinalStatus("PENDING")).toBe(false);
    expect(isFinalStatus("NEEDS_REVIEW")).toBe(false);
  });
});
