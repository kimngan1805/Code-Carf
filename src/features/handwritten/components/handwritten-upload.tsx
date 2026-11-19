"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CircleAlert, CircleCheck, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HANDWRITTEN_ACCEPT, MAX_HANDWRITTEN_IMAGE_BYTES } from "../rules";

export interface CurrentUpload {
  id: string;
  /** ISO time of the last (re)submission; also keeps the browser from showing a stale image. */
  submittedAt: string;
  /** A graded answer can no longer be replaced. */
  locked: boolean;
}

const ACCEPTED_TYPES = HANDWRITTEN_ACCEPT.split(",");

/** Same limits as the server, only to answer faster; the server stays the authority. */
function checkChosenFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type))
    return "Chỉ nhận ảnh JPG, PNG hoặc WebP.";
  if (file.size > MAX_HANDWRITTEN_IMAGE_BYTES)
    return "Ảnh lớn hơn 5 MB, hãy chụp lại hoặc giảm dung lượng ảnh.";
  return null;
}

export function HandwrittenUpload({
  exerciseId,
  current,
}: {
  exerciseId: string;
  current: CurrentUpload | null;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [chosen, setChosen] = useState<{ file: File; preview: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // The preview is a temporary browser URL; whoever replaces or drops it must free it.
  const previewUrl = useRef<string | null>(null);

  function setChosenFile(file: File | null) {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = file ? URL.createObjectURL(file) : null;
    setChosen(
      file && previewUrl.current ? { file, preview: previewUrl.current } : null,
    );
  }

  useEffect(
    () => () => {
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    },
    [],
  );

  function choose(next: File | undefined) {
    setSaved(false);
    const problem = next ? checkChosenFile(next) : null;
    setError(problem);
    setChosenFile(next && !problem ? next : null);
    if (problem && input.current) input.current.value = "";
  }

  async function submit() {
    if (!chosen) return;
    setSubmitting(true);
    setError(null);
    const form = new FormData();
    form.set("image", chosen.file);
    try {
      const response = await fetch(`/api/exercises/${exerciseId}/handwritten`, {
        method: "POST",
        body: form,
      });
      const body = (await response.json().catch(() => null)) as {
        error: { message: string } | null;
      } | null;
      if (!response.ok)
        throw new Error(
          body?.error?.message ??
            (response.status === 413
              ? "Ảnh lớn hơn 5 MB, hãy chụp lại hoặc giảm dung lượng ảnh."
              : undefined),
        );
      setChosenFile(null);
      setSaved(true);
      if (input.current) input.current.value = "";
      router.refresh();
    } catch (failure) {
      setError(
        failure instanceof Error && failure.message
          ? failure.message
          : "Không nộp được ảnh, vui lòng thử lại.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const locked = current?.locked ?? false;
  const savedImage = current
    ? `/api/submissions/${current.id}/image?v=${encodeURIComponent(current.submittedAt)}`
    : null;

  return (
    <section
      className="space-y-4 rounded-2xl border bg-background p-5"
      aria-labelledby="upload-title"
    >
      <h2 id="upload-title" className="text-lg font-semibold">
        Bài làm của bạn
      </h2>

      {current && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Ảnh đã nộp lúc{" "}
            {new Date(current.submittedAt).toLocaleString("vi-VN")}.
            {locked
              ? " Bài đã được chấm nên không thể nộp lại."
              : " Bạn có thể nộp lại để thay ảnh này."}
          </p>
          {/* Private, authenticated image: next/image's optimizer cannot fetch it. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={savedImage ?? undefined}
            alt="Ảnh bài làm đã nộp"
            className="max-h-96 w-full rounded-xl border bg-muted object-contain"
          />
        </div>
      )}

      {!locked && (
        <div className="space-y-3">
          <label
            htmlFor="handwritten-image"
            className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed px-4 py-4 text-sm transition-colors hover:border-primary/40 hover:bg-muted/40 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring"
          >
            <ImagePlus className="size-5 shrink-0 text-primary" aria-hidden />
            <span className="min-w-0">
              <span className="block font-semibold">
                {current ? "Chọn ảnh mới" : "Chọn ảnh bài làm"}
              </span>
              <span className="block text-muted-foreground">
                JPG, PNG hoặc WebP, tối đa 5 MB
              </span>
            </span>
            <input
              ref={input}
              id="handwritten-image"
              type="file"
              accept={HANDWRITTEN_ACCEPT}
              disabled={submitting}
              className="sr-only"
              onChange={(event) => choose(event.target.files?.[0])}
            />
          </label>

          {chosen && (
            <div className="space-y-2">
              <p className="text-sm break-words text-muted-foreground">
                Ảnh sẽ nộp: {chosen.file.name}
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={chosen.preview}
                alt="Xem trước ảnh sẽ nộp"
                className="max-h-96 w-full rounded-xl border bg-muted object-contain"
              />
            </div>
          )}

          <Button
            type="button"
            onClick={submit}
            disabled={!chosen || submitting}
          >
            {submitting
              ? "Đang nộp…"
              : current
                ? "Nộp lại ảnh"
                : "Nộp ảnh bài làm"}
          </Button>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
      {saved && !error && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl bg-success/10 px-4 py-3 text-sm text-foreground"
        >
          <CircleCheck className="size-4 shrink-0" aria-hidden />
          Đã nộp ảnh bài làm.
        </p>
      )}
    </section>
  );
}
