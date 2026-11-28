"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  CodeXml,
  LoaderCircle,
  MonitorPlay,
  Plus,
  Presentation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENT_LABEL,
} from "@/features/rooms/attachment-rules";
import { youtubeVideoId } from "@/features/rooms/youtube";
import { addLibraryVideoAction } from "../actions";
import { Modal } from "./modal";

const itemClass =
  "flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors hover:bg-secondary/40 focus-visible:bg-secondary/40 focus-visible:outline-none";

function ItemBody({
  icon,
  tone,
  title,
  hint,
}: {
  icon: React.ReactNode;
  tone: string;
  title: string;
  hint: string;
}) {
  return (
    <>
      <span
        aria-hidden
        className={`grid size-10 shrink-0 place-items-center rounded-xl ${tone}`}
      >
        {icon}
      </span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs leading-5 text-muted-foreground">
          {hint}
        </span>
      </span>
    </>
  );
}

/**
 * Nút "Thêm tài liệu" duy nhất của kho: chọn thêm bài tập, file bài giảng hoặc
 * video YouTube. Đang lọc một danh mục thì mục mới vào luôn danh mục đó.
 */
export function LibraryAddMenu({ categoryId }: { categoryId?: string }) {
  const router = useRouter();
  const menuId = useId();
  const wrapper = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(
    null,
  );

  useEffect(() => {
    if (!open) return;
    wrapper.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    function onPointer(event: MouseEvent) {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setPending(true);
    setStatus(null);
    let done = 0;
    let failure: string | null = null;
    for (const file of Array.from(files)) {
      const body = new FormData();
      body.append("file", file);
      if (categoryId) body.append("categoryId", categoryId);
      try {
        const response = await fetch("/api/library/files", {
          method: "POST",
          body,
        });
        if (!response.ok) {
          const result = await response.json().catch(() => null);
          failure = `${file.name}: ${result?.error?.message ?? "chưa tải lên được."}`;
          break;
        }
        done += 1;
      } catch {
        failure = "Mất kết nối. Vui lòng thử lại.";
        break;
      }
    }
    setPending(false);
    if (input.current) input.current.value = "";
    setStatus(
      failure
        ? { ok: false, text: failure }
        : { ok: true, text: `Đã thêm ${done} bài giảng vào kho.` },
    );
    if (done) {
      router.push(
        `/gv/library?tab=bai-giang${categoryId ? `&danhMuc=${categoryId}` : ""}`,
      );
      router.refresh();
    }
  }

  return (
    <div
      ref={wrapper}
      className="relative flex flex-col items-start gap-2 lg:items-end"
    >
      <input
        ref={input}
        type="file"
        multiple
        accept={ATTACHMENT_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => upload(event.target.files)}
      />
      <Button
        type="button"
        disabled={pending}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className="rounded-full px-5 shadow-[3px_3px_0_0_var(--brand-blue)]"
      >
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
        ) : (
          <Plus className="size-4" aria-hidden />
        )}
        {pending ? "Đang tải lên..." : "Thêm tài liệu"}
        {!pending && <ChevronDown className="size-4" aria-hidden />}
      </Button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Thêm tài liệu"
          className="absolute top-full left-0 z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border-2 border-primary bg-background p-1.5 shadow-[4px_4px_0_0_var(--brand-blue)] lg:right-0 lg:left-auto"
        >
          <Link
            role="menuitem"
            href={`/gv/library/exercises/new${categoryId ? `?danhMuc=${categoryId}` : ""}`}
            onClick={() => setOpen(false)}
            className={itemClass}
          >
            <ItemBody
              icon={<CodeXml className="size-5" />}
              tone="bg-secondary/70 text-primary"
              title="Bài tập"
              hint="Code chấm tự động, trắc nghiệm hoặc tự luận."
            />
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              input.current?.click();
            }}
            className={itemClass}
          >
            <ItemBody
              icon={<Presentation className="size-5" />}
              tone="bg-accent/15 text-accent-strong"
              title="Bài giảng: file"
              hint={`PDF, slide PowerPoint hoặc Word, tối đa ${MAX_ATTACHMENT_LABEL} mỗi file. Chọn nhiều file một lần được.`}
            />
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setVideoOpen(true);
            }}
            className={itemClass}
          >
            <ItemBody
              icon={<MonitorPlay className="size-5" />}
              tone="bg-destructive/10 text-destructive"
              title="Bài giảng: video YouTube"
              hint="Dán link video bài giảng để dùng lại trong nhiều bài học."
            />
          </button>
        </div>
      )}

      {videoOpen && (
        <VideoDialog
          categoryId={categoryId}
          onClose={() => setVideoOpen(false)}
          onAdded={() => {
            setVideoOpen(false);
            setStatus({ ok: true, text: "Đã thêm video vào kho." });
            router.push(
              `/gv/library?tab=bai-giang&loaiBaiGiang=VIDEO${categoryId ? `&danhMuc=${categoryId}` : ""}`,
            );
            router.refresh();
          }}
        />
      )}

      {status && (
        <p
          role={status.ok ? "status" : "alert"}
          className={
            status.ok
              ? "text-sm font-medium text-success"
              : "text-sm font-medium text-destructive"
          }
        >
          {status.text}
        </p>
      )}
    </div>
  );
}

function VideoDialog({
  categoryId,
  onClose,
  onAdded,
}: {
  categoryId?: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const urlId = useId();
  const titleId = useId();
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const videoId = url.trim() ? youtubeVideoId(url.trim()) : null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!videoId) {
      setError("Link không phải video YouTube hợp lệ.");
      return;
    }
    setPending(true);
    setError("");
    const result = await addLibraryVideoAction({
      url: url.trim(),
      title,
      categoryId: categoryId ?? null,
    });
    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onAdded();
  }

  return (
    <Modal title="Thêm video bài giảng" onClose={onClose}>
      <form onSubmit={submit} noValidate className="space-y-4 p-5 sm:p-6">
        <div className="space-y-1.5">
          <label htmlFor={urlId} className="text-sm font-semibold">
            Link YouTube <span className="text-destructive">*</span>
          </label>
          <input
            id={urlId}
            type="url"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              setError("");
            }}
            placeholder="https://www.youtube.com/watch?v=..."
            className="h-11 w-full rounded-xl border-2 border-input bg-background px-3.5 text-sm focus-visible:border-primary focus-visible:outline-none"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={titleId} className="text-sm font-semibold">
            Tên bài giảng
          </label>
          <input
            id={titleId}
            value={title}
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ví dụ: Vòng lặp for trong Python"
            className="h-11 w-full rounded-xl border-2 border-input bg-background px-3.5 text-sm focus-visible:border-primary focus-visible:outline-none"
          />
        </div>
        {videoId && (
          <div className="aspect-video overflow-hidden rounded-xl border bg-muted">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${videoId}`}
              title="Xem trước video"
              className="size-full"
              allow="encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Hủy
          </Button>
          <Button type="submit" disabled={pending || !videoId}>
            {pending && (
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
            )}
            Thêm vào kho
          </Button>
        </div>
      </form>
    </Modal>
  );
}
