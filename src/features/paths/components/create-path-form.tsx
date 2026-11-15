"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookPlus, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pathFieldsSchema } from "../creation-schema";

export function CreatePathForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sequentialUnlock, setSequentialUnlock] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<{
    title?: string;
    description?: string;
  }>({});
  const inFlight = useRef(false);
  const request = useRef<{ fingerprint: string; id: string } | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    setError("");
    setFields({});
    const parsed = pathFieldsSchema.safeParse({
      title,
      description,
      sequentialUnlock,
    });
    if (!parsed.success) {
      const next: { title?: string; description?: string } = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "title") next.title ??= issue.message;
        if (issue.path[0] === "description") next.description ??= issue.message;
      }
      setFields(next);
      return;
    }
    inFlight.current = true;
    setPending(true);
    let navigating = false;
    try {
      const fingerprint = JSON.stringify(parsed.data);
      if (request.current?.fingerprint !== fingerprint)
        request.current = { fingerprint, id: crypto.randomUUID() };
      const response = await fetch("/api/paths", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...parsed.data, requestId: request.current.id }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.error?.code === "CREATION_REQUEST_REUSED")
          request.current = null;
        throw new Error(
          result.error?.message ?? "Chưa thể tạo lộ trình. Vui lòng thử lại.",
        );
      }
      router.push(
        `/gv/paths/${encodeURIComponent(result.data.slug)}?created=1`,
      );
      navigating = true;
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Mất kết nối. Vui lòng thử lại.",
      );
    } finally {
      if (!navigating) {
        inFlight.current = false;
        setPending(false);
      }
    }
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="rounded-2xl border bg-background p-5 sm:p-7"
    >
      <fieldset disabled={pending} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="path-title" className="text-sm font-semibold">
            Tên lộ trình <span className="text-destructive">*</span>
          </label>
          <input
            id="path-title"
            name="title"
            required
            maxLength={100}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            aria-invalid={!!fields.title}
            aria-describedby={fields.title ? "path-title-error" : undefined}
            placeholder="Ví dụ: Lập trình C++ cơ bản"
            className="h-11 w-full rounded-lg border bg-background px-3 text-sm focus-visible:outline-2"
          />
          {fields.title && (
            <p
              id="path-title-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {fields.title}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor="path-description" className="text-sm font-semibold">
            Mô tả{" "}
            <span className="font-normal text-muted-foreground">
              (không bắt buộc)
            </span>
          </label>
          <textarea
            id="path-description"
            name="description"
            rows={5}
            maxLength={5000}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            aria-invalid={!!fields.description}
            aria-describedby={
              fields.description ? "path-description-error" : undefined
            }
            placeholder="Giới thiệu nội dung và những gì học viên sẽ học được."
            className="block w-full resize-y rounded-lg border bg-background p-3 text-sm focus-visible:outline-2"
          />
          {fields.description && (
            <p
              id="path-description-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {fields.description}
            </p>
          )}
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-muted/50 p-4">
          <input
            type="checkbox"
            name="sequentialUnlock"
            checked={sequentialUnlock}
            onChange={(event) => setSequentialUnlock(event.target.checked)}
            className="mt-1 size-4 accent-primary"
          />
          <span>
            <span className="block text-sm font-semibold">
              Mở khóa bài học theo thứ tự
            </span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              Học viên hoàn thành bài học trước để mở bài tiếp theo.
            </span>
          </span>
        </label>
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => router.push("/gv/paths")}
          >
            Hủy
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? (
              <LoaderCircle aria-hidden className="size-4 animate-spin" />
            ) : (
              <BookPlus aria-hidden className="size-4" />
            )}
            {pending ? "Đang tạo..." : "Tạo lộ trình"}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
