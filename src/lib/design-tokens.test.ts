import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(process.cwd(), "src");
const PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
// Tailwind palette classes (bg-red-500), black/white utilities, arbitrary colors (bg-[#fff]) and hex literals.
const RAW_COLOR = new RegExp(
  `\\b(?:bg|text|border|ring|outline|fill|stroke|from|via|to|divide|placeholder|decoration|shadow)-(?:(?:${PALETTE})-\\d{2,3}|black|white|\\[#)|#[0-9a-fA-F]{3,8}\\b`,
);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(tsx?|jsx?)$/.test(name) && !name.endsWith(".test.ts")
      ? [path]
      : [];
  });
}

describe("design tokens", () => {
  it("uses semantic color tokens instead of raw colors", () => {
    const offenders = sourceFiles(SRC).flatMap((file) =>
      readFileSync(file, "utf8")
        .split("\n")
        .flatMap((line, index) =>
          RAW_COLOR.test(line)
            ? [`${file.slice(SRC.length + 1)}:${index + 1}: ${line.trim()}`]
            : [],
        ),
    );
    expect(
      offenders,
      "Use tokens from docs/design-system.md instead of raw colors",
    ).toEqual([]);
  });
});
