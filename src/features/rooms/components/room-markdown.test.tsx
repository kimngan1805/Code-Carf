import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { RoomMarkdown } from "./room-markdown";

it("renders headings, code, lists and GFM tables", () => {
  const html = renderToStaticMarkup(
    <RoomMarkdown
      content={
        "# Theory\n\n- Item\n\n```ts\nconst x = 1;\n```\n\n| A | B |\n| - | - |\n| 1 | 2 |"
      }
    />,
  );
  expect(html).toContain("<h2");
  expect(html).toContain("<li>");
  expect(html).toContain("<pre>");
  expect(html).toContain("<table");
});
it("ignores raw script/HTML and rejects unsafe markdown links", () => {
  const html = renderToStaticMarkup(
    <RoomMarkdown
      content={
        "<script>window.pwned = true</script>\n\n[click](javascript:alert%281%29)\n\n<img src=x onerror=alert(1)>"
      }
    />,
  );
  expect(html).not.toContain("<script");
  expect(html).not.toContain("javascript:");
  expect(html).not.toContain("onerror");
});
