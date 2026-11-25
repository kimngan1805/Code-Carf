"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Download,
  LoaderCircle,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENT_LABEL,
  MAX_ATTACHMENTS_PER_ROOM,
  formatFileSize,
} from "../attachment-rules";
import {
  deleteAttachmentAction,
  reorderAttachmentsAction,
} from "../attachment-actions";
import type { RoomAttachmentItem } from "../attachments";
import {
  AttachmentIcon,
  attachmentHref,
  attachmentLabel,
} from "./room-attachments";

/** Upload, reorder and remove the lecture files of one lesson. Every change is saved at once. */
export function LessonAttachments({
  roomId,
  initial,
}: {
  roomId: string;
  initial: RoomAttachmentItem[];
}) {
  const router = useRouter();
  const [files, setFiles] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const full = files.length >= MAX_ATTACHMENTS_PER_ROOM;

  async function upload(selected: FileList | null) {
    if (!selected?.length || busy) return;
    setError("");
    setStatus("");
    setBusy("upload");
    try {
      let added = 0;
      for (const file of Array.from(selected)) {
        if (file.size > MAX_ATTACHMENT_BYTES) {
          setError(`"${file.name}" lớn hơn ${MAX_ATTACHMENT_LABEL}.`);
          break;
        }
        const body = new FormData();
        body.append("file", file);
        const response = await fetch(
          `/api/rooms/${encodeURIComponent(roomId)}/attachments`,
          { method: "POST", body },
        );
        const result = (await response.json().catch(() => null)) as {
          data: RoomAttachmentItem | null;
          error: { message: string } | null;
        } | null;
        if (!response.ok || !result?.data) {
          setError(
            `"${file.name}": ${result?.error?.message ?? "Chưa thể tải tệp lên."}`,
          );
          break;
        }
        const saved = result.data;
        setFiles((previous) => [...previous, saved]);
        added++;
      }
      if (added) {
        setStatus(`Đã tải lên ${added} tài liệu.`);
        router.refresh();
      }
    } catch {
      setError("Mất kết nối khi tải tệp. Vui lòng thử lại.");
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
    }
  }

  async function apply(
    key: string,
    action: () => ReturnType<typeof reorderAttachmentsAction>,
    done: string,
  ) {
    if (busy) return;
    setError("");
    setStatus("");
    setBusy(key);
    try {
      const result = await action();
      if (result.error !== null) setError(result.error);
      else {
        setFiles(result.data);
        setStatus(done);
        router.refresh();
      }
    } catch {
      setError("Mất kết nối. Vui lòng thử lại.");
    } finally {
      setBusy(null);
    }
  }

  function move(index: number, offset: -1 | 1) {
    const next = files.map((file) => file.id);
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    void apply(
      `move-${files[index].id}`,
      () => reorderAttachmentsAction(roomId, next),
      "Đã đổi thứ tự tài liệu.",
    );
  }

  function remove(file: RoomAttachmentItem) {
    if (!window.confirm(`Xóa tài liệu "${file.fileName}"?`)) return;
    void apply(
      `delete-${file.id}`,
      () => deleteAttachmentAction(roomId, file.id),
      "Đã xóa tài liệu.",
    );
  }

  return (
    <section
      aria-labelledby="lesson-attachments-title"
      aria-busy={busy !== null}
      className="space-y-4 rounded-2xl border bg-background p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 id="lesson-attachments-title" className="text-lg font-semibold">
            Tài liệu đính kèm
          </h2>
          <p
            id="lesson-attachments-help"
            className="text-xs text-muted-foreground"
          >
            PDF, PowerPoint (.pptx) hoặc Word (.docx), tối đa{" "}
            {MAX_ATTACHMENT_LABEL} mỗi tệp. Học viên xem PDF ngay trong bài và
            tải về các tệp khác. Thay đổi được lưu ngay.
          </p>
        </div>
        <input
          ref={input}
          id="lesson-attachments-input"
          type="file"
          multiple
          accept={ATTACHMENT_ACCEPT}
          className="sr-only"
          aria-describedby="lesson-attachments-help"
          onChange={(event) => void upload(event.target.files)}
          disabled={busy !== null || full}
        />
        <Button
          type="button"
          variant="outline"
          disabled={busy !== null || full}
          onClick={() => input.current?.click()}
        >
          {busy === "upload" ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
          ) : (
            <Upload className="size-4" aria-hidden />
          )}
          {busy === "upload" ? "Đang tải lên..." : "Tải tài liệu lên"}
        </Button>
      </div>
      {files.length === 0 ? (
        <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          Chưa có tài liệu nào.
        </p>
      ) : (
        <ol className="divide-y rounded-xl border">
          {files.map((file, index) => (
            <li
              key={file.id}
              className="flex flex-wrap items-center justify-between gap-3 p-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <AttachmentIcon contentType={file.contentType} />
                <div className="min-w-0">
                  <a
                    href={`${attachmentHref(roomId, file.id)}?download=1`}
                    className="font-medium break-words text-foreground hover:underline"
                  >
                    {file.fileName}
                  </a>
                  <p className="text-xs text-muted-foreground">
                    {attachmentLabel(file.contentType)} ·{" "}
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={busy !== null || index === 0}
                  onClick={() => move(index, -1)}
                  aria-label={`Đưa "${file.fileName}" lên trên`}
                >
                  <ArrowUp className="size-4" aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={busy !== null || index === files.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label={`Đưa "${file.fileName}" xuống dưới`}
                >
                  <ArrowDown className="size-4" aria-hidden />
                </Button>
                <Button asChild variant="ghost" size="icon">
                  <a
                    href={`${attachmentHref(roomId, file.id)}?download=1`}
                    aria-label={`Tải "${file.fileName}"`}
                  >
                    <Download className="size-4" aria-hidden />
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={busy !== null}
                  onClick={() => remove(file)}
                  aria-label={`Xóa "${file.fileName}"`}
                  className="text-destructive hover:bg-destructive/10"
                >
                  {busy === `delete-${file.id}` ? (
                    <LoaderCircle className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Trash2 className="size-4" aria-hidden />
                  )}
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}
      {full && (
        <p className="text-xs text-muted-foreground">
          Đã đạt tối đa {MAX_ATTACHMENTS_PER_ROOM} tài liệu cho bài học này.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <p role="status" className="text-sm text-muted-foreground">
        {status}
      </p>
    </section>
  );
}
