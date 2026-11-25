import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { youtubeVideoId } from "../youtube";

type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: { href?: unknown };
  children?: HastNode[];
};

/** A paragraph that holds nothing but one YouTube link becomes an embedded player. */
function videoInParagraph(node: HastNode | undefined) {
  const children = (node?.children ?? []).filter(
    (child) => !(child.type === "text" && !child.value?.trim()),
  );
  const [only] = children;
  if (children.length !== 1 || only.tagName !== "a") return null;
  const href = only.properties?.href;
  return typeof href === "string" ? youtubeVideoId(href) : null;
}

/**
 * No raw HTML plugin: user-authored markup is never executed. The only embed is
 * a YouTube player, built from a validated video id on a privacy-enhanced domain.
 */
export function RoomMarkdown({ content }: { content: string }) {
  return (
    <div className="min-w-0 space-y-4 text-sm leading-7 break-words [&_h1]:mt-6 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-muted [&_pre]:p-4 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_a]:text-primary [&_a]:underline [&_th]:border [&_th]:p-2 [&_td]:border [&_td]:p-2 [&_hr]:border-border">
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          p: ({ node, children }) => {
            const id = videoInParagraph(node as HastNode | undefined);
            if (!id) return <p>{children}</p>;
            return (
              <span className="block aspect-video w-full overflow-hidden rounded-2xl border-2 border-primary bg-muted shadow-[4px_4px_0_0_var(--brand-blue)]">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${id}`}
                  title="Video bài giảng"
                  loading="lazy"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  className="size-full"
                />
              </span>
            );
          },
          h1: ({ children }) => (
            <h2 className="mt-6 text-2xl font-bold">{children}</h2>
          ),
          table: ({ children }) => (
            <div className="max-w-full overflow-x-auto">
              <table className="w-full border-collapse text-left">
                {children}
              </table>
            </div>
          ),
          img: ({ alt }) => (
            <span className="text-muted-foreground">
              {alt ? `[Ảnh: ${alt}]` : "[Ảnh minh họa]"}
            </span>
          ),
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
