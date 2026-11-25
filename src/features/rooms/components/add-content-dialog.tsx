"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  CodeXml,
  LoaderCircle,
  MonitorPlay,
  Plus,
  Presentation,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { addLessonVideoAction } from "../authoring-actions";
import { youtubeVideoId } from "../youtube";

type Step = "choose" | "video";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const optionClass =
  "group flex w-full items-center gap-3.5 rounded-2xl border border-border/80 bg-background p-4 text-left transition-[border-color,box-shadow,background-color] hover:border-primary/50 hover:bg-secondary/30 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function OptionBody({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <>
      <span
        aria-hidden
        className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary/70 text-primary"
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 space-y-0.5">
        <span className="block text-sm font-semibold text-foreground">
          {title}
        </span>
        <span className="block text-xs leading-5 text-muted-foreground">
          {hint}
        </span>
      </span>
      <ChevronRight
        aria-hidden
        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
      />
    </>
  );
}

/**
 * Nút "Thêm nội dung" của một bài học: mở hộp thoại giữa màn hình để chọn thêm
 * slide bài giảng, video YouTube hoặc bài tập.
 */
export function AddContentButton({
  pathSlug,
  roomId,
  roomTitle,
  className,
}: {
  pathSlug: string;
  roomId: string;
  roomTitle: string;
  className?: string;
}) {
  const router = useRouter();
  const titleId = useId();
  const urlId = useId();
  const captionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("choose");
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const trimmedUrl = url.trim();
  const videoId = trimmedUrl ? youtubeVideoId(trimmedUrl) : null;
  const urlInvalid = trimmedUrl !== "" && !videoId;

  function openDialog() {
    setStep("choose");
    setUrl("");
    setCaption("");
    setError("");
    setMessage("");
    setOpen(true);
  }

  function close() {
    if (pending) return;
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!pending) setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusables = [
        ...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ];
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [open, pending]);

  // Mỗi lần đổi bước, đưa focus vào phần tử đầu tiên của bước đó.
  useEffect(() => {
    if (!open) return;
    const target =
      step === "video"
        ? panelRef.current?.querySelector<HTMLElement>(`#${CSS.escape(urlId)}`)
        : panelRef.current?.querySelector<HTMLElement>("[data-first-option]");
    target?.focus();
  }, [open, step, urlId]);

  async function submitVideo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (!videoId) {
      setError(
        "Link không phải video YouTube hợp lệ. Hãy dán link dạng https://www.youtube.com/watch?v=... hoặc https://youtu.be/...",
      );
      return;
    }
    setPending(true);
    setError("");
    try {
      const result = await addLessonVideoAction({
        pathSlug,
        roomId,
        url: trimmedUrl,
        caption,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setMessage(`Đã thêm video vào bài "${roomTitle}".`);
      router.refresh();
    } catch {
      setError("Mất kết nối. Vui lòng thử lại.");
    } finally {
      setPending(false);
    }
  }

  const roomHref = `/gv/paths/${pathSlug}/rooms/${roomId}`;
  const exerciseHref = `${roomHref}/exercises/new`;
  // Mục tải file trên trang sửa bài học có id cố định này.
  const slideHref = `${roomHref}/edit#tai-lieu-dinh-kem`;

  const dialog = open ? (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/45 p-4 backdrop-blur-xs"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={panelRef}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border/80 bg-background shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-4 sm:px-6">
          <div className="min-w-0 space-y-0.5">
            <h2
              id={titleId}
              className="text-lg font-bold tracking-tight text-foreground"
            >
              {step === "choose" ? "Thêm nội dung" : "Thêm video YouTube"}
            </h2>
            <p className="truncate text-xs text-muted-foreground">
              Bài học: {roomTitle}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Đóng"
            disabled={pending}
            onClick={close}
            className="-mr-2 size-8 rounded-lg p-0 text-muted-foreground"
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>

        {step === "choose" ? (
          <div className="space-y-2.5 p-5 sm:p-6">
            <button
              type="button"
              data-first-option
              className={optionClass}
              onClick={() => {
                setError("");
                setStep("video");
              }}
            >
              <OptionBody
                icon={<MonitorPlay className="size-5" />}
                title="Video YouTube"
                hint="Dán link video, video hiện thành khung phát trong mục Video bài giảng."
              />
            </button>
            <Link href={exerciseHref} className={optionClass}>
              <OptionBody
                icon={<CodeXml className="size-5" />}
                title="Bài tập"
                hint="Bài code chấm tự động, trắc nghiệm hoặc tự luận nộp ảnh."
              />
            </Link>
            <Link href={slideHref} className={optionClass}>
              <OptionBody
                icon={<Presentation className="size-5" />}
                title="Slide bài giảng (PDF, PPTX)"
                hint="Tải file bài giảng lên (PDF, PowerPoint, Word, tối đa 20 MB) để học viên xem hoặc tải về."
              />
            </Link>
          </div>
        ) : (
          <form onSubmit={submitVideo} noValidate>
            <div className="space-y-4 p-5 sm:p-6">
              <div className="space-y-1.5">
                <label htmlFor={urlId} className="text-sm font-semibold">
                  Link video <span className="text-destructive">*</span>
                </label>
                <input
                  id={urlId}
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  value={url}
                  disabled={pending}
                  onChange={(event) => {
                    setUrl(event.target.value);
                    setError("");
                  }}
                  placeholder="https://www.youtube.com/watch?v=..."
                  aria-invalid={urlInvalid}
                  aria-describedby={`${urlId}-help`}
                  className="h-11 w-full rounded-xl border-2 border-input bg-background px-3.5 text-sm placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:outline-none aria-invalid:border-destructive"
                />
                <p
                  id={`${urlId}-help`}
                  className={cn(
                    "text-xs",
                    urlInvalid ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {urlInvalid
                    ? "Chưa nhận ra video. Link cần là youtube.com/watch?v=..., youtu.be/..., /shorts/... hoặc /embed/..."
                    : videoId
                      ? `Đã nhận video: ${videoId}`
                      : "Nhận link youtube.com, youtu.be, Shorts và link nhúng."}
                </p>
              </div>
              <div className="space-y-1.5">
                <label htmlFor={captionId} className="text-sm font-semibold">
                  Chú thích{" "}
                  <span className="font-normal text-muted-foreground">
                    (không bắt buộc)
                  </span>
                </label>
                <input
                  id={captionId}
                  value={caption}
                  maxLength={200}
                  disabled={pending}
                  onChange={(event) => setCaption(event.target.value)}
                  placeholder="Ví dụ: Bài 42: Con trỏ cơ bản"
                  className="h-11 w-full rounded-xl border-2 border-input bg-background px-3.5 text-sm placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:outline-none"
                />
              </div>
              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm font-medium text-destructive"
                >
                  {error}
                </p>
              )}
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-border/60 bg-muted/30 px-5 py-3.5 sm:flex-row sm:justify-between sm:px-6">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => {
                  setError("");
                  setStep("choose");
                }}
              >
                <ArrowLeft className="size-4" aria-hidden />
                Chọn loại khác
              </Button>
              <Button type="submit" size="sm" disabled={pending || !videoId}>
                {pending ? (
                  <LoaderCircle className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Plus className="size-4" aria-hidden />
                )}
                {pending ? "Đang thêm..." : "Thêm video"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        aria-haspopup="dialog"
        className={cn(
          "inline-flex items-center gap-1 rounded text-xs font-semibold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          className,
        )}
      >
        <Plus className="size-3" aria-hidden />
        Thêm nội dung
      </button>
      {message && (
        <span role="status" className="text-xs font-medium text-success">
          {message}
        </span>
      )}
      {dialog &&
        (typeof document === "undefined"
          ? dialog
          : createPortal(dialog, document.body))}
    </>
  );
}
