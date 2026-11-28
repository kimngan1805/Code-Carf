import { describe, expect, it } from "vitest";
import {
  insertBlock,
  insertCodeBlock,
  insertLink,
  prefixLines,
  wrapSelection,
  type TextSelection,
} from "./markdown-actions";

/** Ghi vùng chọn bằng dấu [ ] để đọc test dễ hơn. */
function show({ value, start, end }: TextSelection) {
  return `${value.slice(0, start)}[${value.slice(start, end)}]${value.slice(end)}`;
}
function sel(marked: string): TextSelection {
  const start = marked.indexOf("[");
  const end = marked.indexOf("]") - 1;
  return { value: marked.replace("[", "").replace("]", ""), start, end };
}

describe("wrapSelection", () => {
  it("bolds the selected text and keeps it selected", () => {
    expect(show(wrapSelection(sel("Con [trỏ] cơ bản"), "**"))).toBe(
      "Con **[trỏ]** cơ bản",
    );
  });
  it("inserts a placeholder when nothing is selected", () => {
    expect(show(wrapSelection(sel("A []B"), "`", "`", "code"))).toBe(
      "A `[code]`B",
    );
  });
  it("removes the formatting when applied twice", () => {
    const once = wrapSelection(sel("x [y] z"), "*");
    expect(show(wrapSelection(once, "*"))).toBe("x [y] z");
  });
});

describe("prefixLines", () => {
  it("turns the current line into a heading and replaces another level", () => {
    expect(show(prefixLines(sel("a\nCon [trỏ]\nb"), "## "))).toBe(
      "a\n[## Con trỏ]\nb",
    );
    expect(show(prefixLines(sel("[### Mục]"), "## "))).toBe("[## Mục]");
  });
  it("makes a bullet list of every selected line, and toggles it back", () => {
    const listed = prefixLines(sel("[một\nhai]"), "- ");
    expect(show(listed)).toBe("[- một\n- hai]");
    expect(show(prefixLines(listed, "- "))).toBe("[một\nhai]");
  });
  it("numbers lines in order", () => {
    expect(show(prefixLines(sel("[một\nhai\nba]"), (i) => `${i + 1}. `))).toBe(
      "[1. một\n2. hai\n3. ba]",
    );
  });
  it("selects a placeholder on an empty line", () => {
    expect(show(prefixLines(sel("a\n[]"), "## ", "Tiêu đề"))).toBe(
      "a\n## [Tiêu đề]",
    );
  });
});

describe("insertBlock", () => {
  it("puts a block on its own paragraph with blank lines around it", () => {
    expect(
      show(insertBlock(sel("Đoạn 1[]Đoạn 2"), "```cpp\ncode\n```", "code")),
    ).toBe("Đoạn 1\n\n```cpp\n[code]\n```\n\nĐoạn 2");
  });
  it("does not add extra blank lines when they already exist", () => {
    expect(show(insertBlock(sel("A\n\n[]\n\nB"), "VIDEO"))).toBe(
      "A\n\nVIDEO[]\n\nB",
    );
  });
  it("never deletes the selected text, inserting after it", () => {
    expect(show(insertBlock(sel("Xem [video] này"), "VIDEO"))).toBe(
      "Xem video\n\nVIDEO[]\n\nnày",
    );
  });
  it("works in an empty editor", () => {
    expect(show(insertBlock(sel("[]"), "VIDEO"))).toBe("VIDEO[]\n");
  });
});

describe("insertLink", () => {
  it("uses the selection as the link text and selects the URL", () => {
    expect(show(insertLink(sel("Xem [tài liệu] này")))).toBe(
      "Xem [tài liệu]([https://]) này",
    );
  });
});

describe("insertCodeBlock", () => {
  it("wraps the selected code in a fenced block", () => {
    expect(show(insertCodeBlock(sel("Ví dụ: [int x = 1;] xong")))).toBe(
      "Ví dụ:\n\n```cpp\n[int x = 1;]\n```\n\nxong",
    );
  });
  it("inserts a sample block ready to type when nothing is selected", () => {
    expect(show(insertCodeBlock(sel("A[]")))).toBe(
      "A\n\n```cpp\n[// code ở đây]\n```\n",
    );
  });
});
