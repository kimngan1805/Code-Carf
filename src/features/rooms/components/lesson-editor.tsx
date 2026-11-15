"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lessonFieldsSchema } from "../authoring-schema";
import { saveLessonAction } from "../authoring-actions";
import { RoomMarkdown } from "./room-markdown";

type Fields = { title: string; description: string; content: string };
export function LessonEditor({
  pathSlug,
  room,
}: {
  pathSlug: string;
  room?: Fields & { id: string };
}) {
  const router = useRouter();
  const [fields, setFields] = useState<Fields>({
    title: room?.title ?? "",
    description: room?.description ?? "",
    content: room?.content ?? "",
  });
  const [preview, setPreview] = useState(false);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>(
    {},
  );
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const request = useRef<{ fingerprint: string; id: string } | null>(null);
  const back = `/gv/paths/${pathSlug}${room ? `/rooms/${room.id}` : ""}`;
  function change(key: keyof Fields, value: string) {
    setFields((previous) => ({ ...previous, [key]: value }));
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    setError("");
    setErrors({});
    const parsed = lessonFieldsSchema.safeParse(fields);
    if (!parsed.success) {
      const next: Partial<Record<keyof Fields, string>> = {};
      for (const issue of parsed.error.issues)
        next[issue.path[0] as keyof Fields] ??= issue.message;
      setErrors(next);
      if (next.content) setPreview(false);
      return;
    }
    inFlight.current = true;
    setPending(true);
    let navigating = false;
    try {
      const fingerprint = JSON.stringify(parsed.data);
      if (request.current?.fingerprint !== fingerprint)
        request.current = { fingerprint, id: crypto.randomUUID() };
      const result = await saveLessonAction({
        ...parsed.data,
        pathSlug,
        ...(room ? { roomId: room.id } : { requestId: request.current.id }),
      });
      if (result.error || !result.data) {
        setError(result.error ?? "Chưa thể lưu bài học.");
        return;
      }
      router.push(
        `/gv/paths/${result.data.slug}/rooms/${result.data.id}?saved=1`,
      );
      router.refresh();
      navigating = true;
    } catch {
      setError("Mất kết nối. Nội dung vẫn được giữ lại, bạn có thể lưu lại.");
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
      aria-busy={pending}
      className="space-y-6 rounded-2xl border bg-background p-4 sm:p-6"
    >
      <fieldset disabled={pending} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="lesson-title" className="text-sm font-semibold">
            Tên bài học <span className="text-destructive">*</span>
          </label>
          <input
            id="lesson-title"
            required
            maxLength={100}
            value={fields.title}
            onChange={(e) => change("title", e.target.value)}
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? "lesson-title-error" : undefined}
            className="h-11 w-full rounded-lg border bg-background px-3 text-sm focus-visible:outline-2"
            placeholder="Ví dụ: Biến và kiểu dữ liệu"
          />
          {errors.title && (
            <p
              id="lesson-title-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {errors.title}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor="lesson-description" className="text-sm font-semibold">
            Mô tả ngắn (không bắt buộc)
          </label>
          <textarea
            id="lesson-description"
            rows={2}
            maxLength={5000}
            value={fields.description}
            onChange={(e) => change("description", e.target.value)}
            aria-invalid={!!errors.description}
            aria-describedby={
              errors.description ? "lesson-description-error" : undefined
            }
            className="block w-full rounded-lg border bg-background p-3 text-sm focus-visible:outline-2"
          />
          {errors.description && (
            <p
              id="lesson-description-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {errors.description}
            </p>
          )}
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label htmlFor="lesson-content" className="text-sm font-semibold">
              Nội dung bài học <span className="text-destructive">*</span>
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPreview(!preview)}
              aria-pressed={preview}
            >
              {preview ? "Tiếp tục soạn" : "Xem trước"}
            </Button>
          </div>
          <p id="lesson-content-help" className="text-xs text-muted-foreground">
            Hỗ trợ Markdown: tiêu đề, danh sách, bảng và khối code.
          </p>
          {preview ? (
            <section
              aria-label="Xem trước nội dung"
              className="min-h-80 rounded-xl border bg-muted/20 p-4"
            >
              {fields.content.trim() ? (
                <RoomMarkdown content={fields.content} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Chưa có nội dung để xem trước.
                </p>
              )}
            </section>
          ) : (
            <textarea
              id="lesson-content"
              required
              rows={18}
              maxLength={100000}
              value={fields.content}
              onChange={(e) => change("content", e.target.value)}
              aria-invalid={!!errors.content}
              aria-describedby={`lesson-content-help${errors.content ? " lesson-content-error" : ""}`}
              className="block w-full resize-y rounded-xl border bg-background p-4 font-mono text-sm leading-6 focus-visible:outline-2"
              placeholder={
                "## Mục tiêu bài học\n\nNhập nội dung lý thuyết tại đây..."
              }
            />
          )}
          {errors.content && (
            <p
              id="lesson-content-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {errors.content}
            </p>
          )}
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-3 border-t pt-5">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(back)}
          >
            Hủy
          </Button>
          <Button type="submit">
            {pending ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
            ) : (
              <Save className="size-4" aria-hidden />
            )}
            {pending ? "Đang lưu..." : room ? "Lưu thay đổi" : "Thêm bài học"}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
