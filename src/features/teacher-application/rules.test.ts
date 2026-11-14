import { describe, expect, it } from "vitest";
import { PROVINCES } from "./provinces";
import {
  applicationSchema,
  detectFileType,
  MAX_DOCUMENT_BYTES,
  validateDocuments,
} from "./rules";

const bytes = (...values: number[]) =>
  new Uint8Array([...values, ...Array(16).fill(0)]);
const text = (value: string) =>
  new Uint8Array(
    [...value].map((c) => c.charCodeAt(0)).concat(Array(16).fill(0)),
  );

const jpeg = bytes(0xff, 0xd8, 0xff, 0xe0);
const png = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const pdf = text("%PDF-1.7");
const webp = text("RIFF\0\0\0\0WEBP");

describe("provinces", () => {
  it("lists the 34 provincial-level units without duplicates", () => {
    expect(PROVINCES).toHaveLength(34);
    expect(new Set(PROVINCES).size).toBe(34);
  });
});

describe("detectFileType", () => {
  it("recognizes allowed formats by their bytes", () => {
    expect(detectFileType(jpeg)?.mime).toBe("image/jpeg");
    expect(detectFileType(png)?.mime).toBe("image/png");
    expect(detectFileType(pdf)?.mime).toBe("application/pdf");
    expect(detectFileType(webp)?.mime).toBe("image/webp");
  });
  it("rejects other content even if named like an image", () =>
    expect(detectFileType(text("<script>alert(1)</script>"))).toBeNull());
});

describe("validateDocuments", () => {
  const file = (name: string, content: Uint8Array, size = 1000) => ({
    name,
    size,
    bytes: content,
  });

  it("accepts up to three valid files", () =>
    expect(
      validateDocuments([file("the.jpg", jpeg), file("qd.pdf", pdf)]),
    ).toBeNull());
  it("requires at least one file", () =>
    expect(validateDocuments([])).toMatch(/ít nhất/));
  it("limits the number of files", () =>
    expect(validateDocuments(Array(4).fill(file("a.png", png)))).toMatch(
      /tối đa 3/,
    ));
  it("limits the file size", () =>
    expect(
      validateDocuments([file("big.pdf", pdf, MAX_DOCUMENT_BYTES + 1)]),
    ).toMatch(/5 MB/));
  it("rejects disguised files", () =>
    expect(
      validateDocuments([file("fake.jpg", text("MZ executable"))]),
    ).toMatch(/không phải/));
});

describe("applicationSchema", () => {
  it("accepts a known province", () =>
    expect(
      applicationSchema.safeParse({
        teachingLevel: "UNIVERSITY",
        province: "Đà Nẵng",
        schoolName: "Trường Đại học Duy Tân",
      }).success,
    ).toBe(true));
  it("rejects lower school levels and unknown provinces", () => {
    expect(
      applicationSchema.safeParse({
        teachingLevel: "PRIMARY",
        province: "Đà Nẵng",
        schoolName: "Trường A",
      }).success,
    ).toBe(false);
    expect(
      applicationSchema.safeParse({
        teachingLevel: "COLLEGE",
        province: "Quảng Nam",
        schoolName: "Trường A",
      }).success,
    ).toBe(false);
  });
});
