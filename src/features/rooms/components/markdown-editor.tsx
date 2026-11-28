"use client";

import { useLayoutEffect, useRef, useState } from "react";
import {
  Bold,
  Code,
  Columns2,
  Eye,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  MonitorPlay,
  PenLine,
  Quote,
  SquareCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  insertBlock,
  insertCodeBlock,
  insertLink,
  prefixLines,
  wrapSelection,
  type TextSelection,
} from "../markdown-actions";
import { youtubeVideoId } from "../youtube";
import { RoomMarkdown } from "./room-markdown";

type View = "write" | "split" | "preview";

const VIEWS: { value: View; label: string; icon: typeof Eye }[] = [
  { value: "write", label: "Soạn", icon: PenLine },
  { value: "split", label: "Chia đôi", icon: Columns2 },
  { value: "preview", label: "Xem trước", icon: Eye },
];

const toolClass =
  "grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-primary focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40";

/**
 * Ô soạn Markdown thân thiện: thanh công cụ định dạng, chèn video YouTube và xem
 * trước trực tiếp bằng đúng bộ hiển thị của trang học viên. Nội dung vẫn lưu dạng Markdown.
 */
export function MarkdownEditor({
  id,
  value,
  onChange,
  invalid,
  describedBy,
  placeholder,
  disabled,
  actions,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  describedBy?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Nút phụ đặt cạnh chế độ xem (ví dụ: dùng khung mẫu). */
  actions?: React.ReactNode;
}) {
  const textarea = useRef<HTMLTextAreaElement>(null);
  const pendingSelection = useRef<{ start: number; end: number } | null>(null);
  const [view, setView] = useState<View>("split");
  const [videoOpen, setVideoOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const videoId = videoUrl.trim() ? youtubeVideoId(videoUrl.trim()) : null;

  // Sau khi nội dung đổi do thanh công cụ, đặt lại vùng chọn và focus vào ô soạn.
  useLayoutEffect(() => {
    const next = pendingSelection.current;
    const element = textarea.current;
    if (!next || !element) return;
    pendingSelection.current = null;
    element.focus();
    element.setSelectionRange(next.start, next.end);
  }, [value, view]);

  function current(): TextSelection {
    const element = textarea.current;
    return {
      value,
      start: element?.selectionStart ?? value.length,
      end: element?.selectionEnd ?? value.length,
    };
  }

  function apply(edit: (selection: TextSelection) => TextSelection) {
    if (view === "preview") setView("split");
    const result = edit(current());
    pendingSelection.current = { start: result.start, end: result.end };
    onChange(result.value);
  }

  function insertVideo() {
    if (!videoId) return;
    apply((selection) =>
      insertBlock(selection, `https://www.youtube.com/watch?v=${videoId}`),
    );
    setVideoUrl("");
    setVideoOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!(event.metaKey || event.ctrlKey)) return;
    const key = event.key.toLowerCase();
    if (key === "b") {
      event.preventDefault();
      apply((s) => wrapSelection(s, "**", "**", "chữ đậm"));
    } else if (key === "i") {
      event.preventDefault();
      apply((s) => wrapSelection(s, "*", "*", "chữ nghiêng"));
    } else if (key === "k") {
      event.preventDefault();
      apply(insertLink);
    }
  }

  const tools: {
    label: string;
    icon: typeof Bold;
    run: (s: TextSelection) => TextSelection;
  }[] = [
    {
      label: "Tiêu đề mục",
      icon: Heading2,
      run: (s) => prefixLines(s, "## ", "Tiêu đề mục"),
    },
    {
      label: "Tiêu đề nhỏ",
      icon: Heading3,
      run: (s) => prefixLines(s, "### ", "Tiêu đề nhỏ"),
    },
    {
      label: "In đậm (Ctrl/⌘ + B)",
      icon: Bold,
      run: (s) => wrapSelection(s, "**", "**", "chữ đậm"),
    },
    {
      label: "In nghiêng (Ctrl/⌘ + I)",
      icon: Italic,
      run: (s) => wrapSelection(s, "*", "*", "chữ nghiêng"),
    },
    {
      label: "Danh sách chấm",
      icon: List,
      run: (s) => prefixLines(s, "- ", "Ý chính"),
    },
    {
      label: "Danh sách số",
      icon: ListOrdered,
      run: (s) => prefixLines(s, (index) => `${index + 1}. `, "Bước"),
    },
    {
      label: "Trích dẫn / lưu ý",
      icon: Quote,
      run: (s) => prefixLines(s, "> ", "Lưu ý"),
    },
    {
      label: "Code trong dòng",
      icon: Code,
      run: (s) => wrapSelection(s, "`", "`", "code"),
    },
    {
      label: "Khối code",
      icon: SquareCode,
      run: (s) => insertCodeBlock(s),
    },
    { label: "Liên kết (Ctrl/⌘ + K)", icon: Link2, run: insertLink },
  ];

  const showEditor = view !== "preview";
  const showPreview = view !== "write";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-background",
        invalid && "border-destructive",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-2 py-1.5">
        <div
          role="toolbar"
          aria-label="Định dạng nội dung"
          className="flex flex-wrap items-center gap-0.5"
        >
          {tools.map(({ label, icon: Icon, run }) => (
            <button
              key={label}
              type="button"
              title={label}
              aria-label={label}
              disabled={disabled}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => apply(run)}
              className={toolClass}
            >
              <Icon className="size-4" aria-hidden />
            </button>
          ))}
          <span aria-hidden className="mx-1 h-5 w-px bg-border" />
          <button
            type="button"
            title="Chèn video YouTube"
            aria-label="Chèn video YouTube"
            aria-expanded={videoOpen}
            disabled={disabled}
            onClick={() => setVideoOpen(!videoOpen)}
            className={cn(toolClass, videoOpen && "bg-background text-primary")}
          >
            <MonitorPlay className="size-4" aria-hidden />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <div
            role="radiogroup"
            aria-label="Chế độ hiển thị"
            className="flex rounded-lg bg-background p-0.5 ring-1 ring-border"
          >
            {VIEWS.map(({ value: option, label, icon: Icon }) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={view === option}
                onClick={() => setView(option)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors",
                  view === option && "bg-secondary text-primary",
                  // Chia đôi chỉ hợp màn hình rộng.
                  option === "split" && "hidden lg:inline-flex",
                )}
              >
                <Icon className="size-3.5" aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {videoOpen && (
        <div className="flex flex-wrap items-center gap-2 border-b bg-secondary/30 px-3 py-2">
          <input
            autoFocus
            value={videoUrl}
            onChange={(event) => setVideoUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                insertVideo();
              }
              if (event.key === "Escape") setVideoOpen(false);
            }}
            placeholder="Dán link YouTube, ví dụ https://youtu.be/..."
            aria-label="Link video YouTube"
            aria-invalid={!!videoUrl.trim() && !videoId}
            className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-3 text-sm aria-invalid:border-destructive"
          />
          <Button
            type="button"
            size="sm"
            disabled={!videoId}
            onClick={insertVideo}
          >
            Chèn video
          </Button>
          {videoUrl.trim() && !videoId && (
            <span className="basis-full text-xs text-destructive">
              Chưa nhận ra video YouTube từ link này.
            </span>
          )}
        </div>
      )}

      <div
        className={cn(
          "grid",
          showEditor && showPreview && "lg:grid-cols-2 lg:divide-x",
        )}
      >
        {/* Ô soạn luôn có trong DOM để giữ vùng chọn; chỉ ẩn khi xem trước. */}
        <textarea
          ref={textarea}
          id={id}
          hidden={!showEditor}
          rows={18}
          maxLength={100000}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          placeholder={placeholder}
          className="block min-h-80 w-full resize-y bg-background p-4 font-mono text-sm leading-6 focus-visible:outline-none"
        />
        {showPreview && (
          <section
            aria-label="Xem trước nội dung"
            className={cn(
              "min-h-80 overflow-y-auto bg-muted/10 p-4 sm:p-5",
              showEditor && "hidden max-h-[36rem] lg:block",
            )}
          >
            {value.trim() ? (
              <RoomMarkdown content={value} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Nội dung sẽ hiện ở đây đúng như học viên nhìn thấy.
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
