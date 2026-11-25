/**
 * Các thao tác định dạng cho ô soạn Markdown: nhận nội dung + vùng đang chọn,
 * trả về nội dung mới + vùng chọn mới. Hàm thuần để kiểm thử và dùng lại.
 */
export interface TextSelection {
  value: string;
  start: number;
  end: number;
}

/** Bọc vùng chọn bằng ký hiệu (đậm, nghiêng, code). Bấm lần nữa thì bỏ định dạng. */
export function wrapSelection(
  { value, start, end }: TextSelection,
  before: string,
  after = before,
  placeholder = "chữ",
): TextSelection {
  const selected = value.slice(start, end);
  const outerStart = start - before.length;
  const outerEnd = end + after.length;
  if (
    outerStart >= 0 &&
    value.slice(outerStart, start) === before &&
    value.slice(end, outerEnd) === after
  )
    return {
      value: value.slice(0, outerStart) + selected + value.slice(outerEnd),
      start: outerStart,
      end: outerStart + selected.length,
    };
  const text = selected || placeholder;
  return {
    value: value.slice(0, start) + before + text + after + value.slice(end),
    start: start + before.length,
    end: start + before.length + text.length,
  };
}

/** Vị trí đầu dòng chứa `start` và cuối dòng chứa `end`. */
function lineBounds(value: string, start: number, end: number) {
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const next = value.indexOf(
    "\n",
    Math.max(end - (end > start ? 1 : 0), start),
  );
  return { lineStart, lineEnd: next < 0 ? value.length : next };
}

/**
 * Thêm tiền tố cho mọi dòng đang chọn (tiêu đề, danh sách, trích dẫn). Nếu mọi
 * dòng đã có đúng tiền tố đó thì bỏ đi. Tiêu đề thay cho tiêu đề cấp khác.
 */
export function prefixLines(
  selection: TextSelection,
  prefix: string | ((index: number) => string),
  placeholder = "Nội dung",
): TextSelection {
  const { value, start, end } = selection;
  const { lineStart, lineEnd } = lineBounds(value, start, end);
  const lines = value.slice(lineStart, lineEnd).split("\n");
  const prefixAt = (index: number) =>
    typeof prefix === "string" ? prefix : prefix(index);
  const isHeading = typeof prefix === "string" && /^#+ $/.test(prefix);
  const numbered = typeof prefix !== "string";
  const has = (line: string, index: number) =>
    numbered ? /^\d+\. /.test(line) : line.startsWith(prefixAt(index));
  // Chỉ bỏ định dạng khi có ít nhất một dòng có chữ và mọi dòng có chữ đều đã có tiền tố.
  const filled = lines.filter((line) => line.trim() !== "");
  const remove =
    filled.length > 0 &&
    lines.every((line, index) => line.trim() === "" || has(line, index));
  const next = lines.map((line, index) => {
    if (remove)
      return numbered
        ? line.replace(/^\d+\. /, "")
        : line.slice(prefixAt(index).length);
    const body = isHeading ? line.replace(/^#+\s+/, "") : line;
    return prefixAt(index) + (body || (lines.length === 1 ? placeholder : ""));
  });
  const replaced = next.join("\n");
  const result = value.slice(0, lineStart) + replaced + value.slice(lineEnd);
  if (lines.length === 1 && !remove && !lines[0].trim()) {
    const at = lineStart + prefixAt(0).length;
    return { value: result, start: at, end: at + placeholder.length };
  }
  return { value: result, start: lineStart, end: lineStart + replaced.length };
}

/**
 * Chèn một khối (khối code, link video) thành đoạn riêng: luôn có dòng trống
 * trước và sau để Markdown hiểu đúng. `select` là đoạn trong khối cần bôi đen sau khi chèn.
 */
export function insertBlock(
  { value, end }: TextSelection,
  block: string,
  select?: string,
): TextSelection {
  // Không xóa chữ đang chọn: khối mới chèn ngay sau vùng chọn.
  const start = end;
  const before = value.slice(0, start).replace(/[ \t]+$/, "");
  const after = value.slice(end).replace(/^[ \t]+/, "");
  const lead =
    before === ""
      ? ""
      : before.endsWith("\n\n")
        ? ""
        : before.endsWith("\n")
          ? "\n"
          : "\n\n";
  const tail =
    after === ""
      ? "\n"
      : after.startsWith("\n\n")
        ? ""
        : after.startsWith("\n")
          ? "\n"
          : "\n\n";
  const at = before.length + lead.length;
  const offset = select ? block.indexOf(select) : -1;
  return {
    value: before + lead + block + tail + after,
    start: offset >= 0 ? at + offset : at + block.length,
    end: offset >= 0 ? at + offset + select!.length : at + block.length,
  };
}

/** Liên kết: chữ đang chọn thành tên link, bôi đen phần URL để dán ngay. */
export function insertLink(selection: TextSelection): TextSelection {
  const { value, start, end } = selection;
  const text = value.slice(start, end) || "tên liên kết";
  const url = "https://";
  const inserted = `[${text}](${url})`;
  const urlAt = start + text.length + 3;
  return {
    value: value.slice(0, start) + inserted + value.slice(end),
    start: urlAt,
    end: urlAt + url.length,
  };
}

/** Khối code: bọc chữ đang chọn, hoặc chèn khối mẫu có sẵn chỗ để gõ. */
export function insertCodeBlock(
  selection: TextSelection,
  language = "cpp",
): TextSelection {
  const { value, start, end } = selection;
  const selected = value.slice(start, end);
  if (!selected.trim()) {
    const sample = "// code ở đây";
    return insertBlock(
      selection,
      `\`\`\`${language}\n${sample}\n\`\`\``,
      sample,
    );
  }
  const wrapped = insertBlock(
    { value: value.slice(0, start) + value.slice(end), start, end: start },
    `\`\`\`${language}\n${selected}\n\`\`\``,
    selected,
  );
  return wrapped;
}
