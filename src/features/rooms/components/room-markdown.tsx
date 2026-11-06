import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** No raw HTML plugin: user-authored markup is never executed. */
export function RoomMarkdown({ content }: { content: string }) {
  return (
    <div className="min-w-0 space-y-4 text-sm leading-7 break-words [&_h1]:mt-6 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-muted [&_pre]:p-4 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_a]:text-primary [&_a]:underline [&_th]:border [&_th]:p-2 [&_td]:border [&_td]:p-2 [&_hr]:border-border">
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
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
