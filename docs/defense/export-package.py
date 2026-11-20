"""Export the #128 package to Markdown and Word using only Python's standard library."""

from pathlib import Path
import re
import xml.etree.ElementTree as ET
from xml.sax.saxutils import escape
from zipfile import ZIP_DEFLATED, ZipFile


FOLDER = Path(__file__).resolve().parent
NAME = "Issue-128-Defense-Package"
W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"


def plain(text):
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r"\1 (\2)", text)
    return text.replace("**", "").replace("`", "")


def paragraph(text, style=None, small=False):
    props = f'<w:pStyle w:val="{style}"/>' if style else ""
    run_props = '<w:sz w:val="20"/>' if small else ""
    return (
        f"<w:p><w:pPr>{props}</w:pPr><w:r><w:rPr>{run_props}</w:rPr>"
        f'<w:t xml:space="preserve">{escape(plain(text))}</w:t></w:r></w:p>'
    )


def table(lines):
    rows = []
    for line in lines:
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if all(re.fullmatch(r":?-+:?", cell) for cell in cells):
            continue
        rows.append(cells)
    columns = max(len(row) for row in rows)
    width = 9600 // columns
    grid = "".join(f'<w:gridCol w:w="{width}"/>' for _ in range(columns))
    body = []
    for index, row in enumerate(rows):
        header = '<w:trPr><w:tblHeader/></w:trPr>' if index == 0 else ""
        cells = []
        for value in row:
            shade = '<w:shd w:fill="E8F0FA"/>' if index == 0 else ""
            cells.append(
                f'<w:tc><w:tcPr><w:tcW w:w="{width}" w:type="dxa"/>'
                f"{shade}</w:tcPr>{paragraph(value, small=True)}</w:tc>"
            )
        body.append(f"<w:tr>{header}{''.join(cells)}</w:tr>")
    borders = "".join(
        f'<w:{edge} w:val="single" w:sz="4" w:color="BBCBDD"/>'
        for edge in ("top", "left", "bottom", "right", "insideH", "insideV")
    )
    return (
        '<w:tbl><w:tblPr><w:tblW w:w="9600" w:type="dxa"/>'
        f"<w:tblBorders>{borders}</w:tblBorders>"
        '<w:tblCellMar><w:top w:w="80" w:type="dxa"/>'
        '<w:left w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/>'
        '<w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr>'
        f"<w:tblGrid>{grid}</w:tblGrid>{''.join(body)}</w:tbl>"
    )


def word_body(markdown):
    lines = markdown.splitlines()
    body = []
    index = 0
    in_code = False
    while index < len(lines):
        line = lines[index]
        if line.startswith("```"):
            in_code = not in_code
        elif line.startswith("|") and not in_code:
            end = index + 1
            while end < len(lines) and lines[end].startswith("|"):
                end += 1
            body.append(table(lines[index:end]))
            index = end
            continue
        elif line.strip() and line.strip() != "---":
            heading = re.match(r"^(#{1,6})\s+(.*)", line)
            if heading:
                level = len(heading[1])
                style = "Title" if level == 1 else f"Heading{min(level - 1, 3)}"
                body.append(paragraph(heading[2], style))
            elif line.startswith("- "):
                body.append(paragraph("• " + line[2:]))
            else:
                body.append(paragraph(line))
        index += 1
    return "".join(body)


def main():
    sections = [
        ("I. Nội dung thuyết trình — 10 slide / 6 phút", "slides.md"),
        ("II. Bảng tự đánh giá theo Rubric", "rubric.md"),
        ("III. Kịch bản Live Demo, Q&A và dự phòng", "demo.md"),
    ]
    parts = [
        "# Code Carf — Hồ sơ bảo vệ issue #128",
        "",
        "Nhóm 02 · Quản trị dự án phần mềm (5) · VKU",
        "",
        "Giảng viên: TS. Nguyễn Thanh Tuấn.",
        "",
        "Bản tổng hợp ngày 20/11/2026; số liệu kỹ thuật/GitHub vẫn theo snapshot 19/11/2026, không phải lần đo mới.",
        "",
        "**Lịch bảo vệ: 6 phút slide + 5 phút Live Demo + 5 phút Q&A = 16 phút.**",
        "",
        "**Bản để nhóm rà soát:** điểm tự đánh giá là đề xuất của người soạn; chữ ký, phê duyệt và nghiệm thu còn chờ xác nhận. Không thay thế sign-off của stakeholder.",
    ]
    for title, filename in sections:
        source = (FOLDER / filename).read_text(encoding="utf-8")
        source = re.sub(r"^(#{1,5}) ", r"#\1 ", source, flags=re.MULTILINE)
        parts.extend(["", "---", "", f"## {title}", "", source.rstrip()])
    markdown = "\n".join(parts) + "\n"
    (FOLDER / f"{NAME}.md").write_text(markdown, encoding="utf-8")

    document = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        f'<w:document xmlns:w="{W}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        f"<w:body>{word_body(markdown)}"
        '<w:sectPr><w:footerReference w:type="default" r:id="rIdFooter"/>'
        '<w:pgSz w:w="11906" w:h="16838"/>'
        '<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:footer="567"/>'
        '</w:sectPr></w:body></w:document>'
    )
    styles = (
        f'<w:styles xmlns:w="{W}"><w:docDefaults><w:rPrDefault><w:rPr>'
        '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>'
        '<w:sz w:val="24"/><w:lang w:val="vi-VN"/></w:rPr></w:rPrDefault>'
        '<w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="276" w:lineRule="auto"/>'
        '</w:pPr></w:pPrDefault></w:docDefaults>'
        '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>'
    )
    for name, size in [("Title", 36), ("Heading1", 32), ("Heading2", 28), ("Heading3", 25)]:
        styles += (
            f'<w:style w:type="paragraph" w:styleId="{name}"><w:name w:val="{name}"/>'
            '<w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="200" w:after="120"/>'
            f'</w:pPr><w:rPr><w:b/><w:color w:val="004DA9"/><w:sz w:val="{size}"/></w:rPr></w:style>'
        )
    styles += "</w:styles>"
    footer = (
        f'<w:ftr xmlns:w="{W}"><w:p><w:pPr><w:jc w:val="center"/></w:pPr>'
        '<w:r><w:t>Code Carf · #128 · </w:t></w:r><w:fldSimple w:instr="PAGE"/>'
        '</w:p></w:ftr>'
    )
    files = {
        "[Content_Types].xml": '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>',
        "_rels/.rels": '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdDoc" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
        "word/document.xml": document,
        "word/styles.xml": styles,
        "word/footer1.xml": footer,
        "word/_rels/document.xml.rels": '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>',
    }
    for content in files.values():
        ET.fromstring(content)
    with ZipFile(FOLDER / f"{NAME}.docx", "w", ZIP_DEFLATED) as archive:
        for filename, content in files.items():
            archive.writestr(filename, content.encode("utf-8"))
    xml = ET.fromstring(document)
    expected_tables = sum(1 for line in markdown.splitlines() if re.match(r"^\|\s*-", line))
    actual_tables = len(xml.findall(f".//{{{W}}}tbl"))
    if actual_tables != expected_tables or actual_tables == 0:
        raise ValueError("Table conversion failed")
    print(f"Exported {NAME}.docx and .md; {actual_tables} Word tables; XML package valid.")


if __name__ == "__main__":
    main()
