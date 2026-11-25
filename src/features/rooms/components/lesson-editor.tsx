"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LayoutTemplate, LoaderCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LESSON_PART_COUNT,
  lessonSkeleton,
} from "@/features/paths/lesson-structure";
import { lessonFieldsSchema } from "../authoring-schema";
import { saveLessonAction } from "../authoring-actions";
import { summarizeContent } from "../lesson-summary";
import { MarkdownEditor } from "./markdown-editor";

type Fields = { title: string; description: string; content: string };

export function LessonEditor({
  pathSlug,
  room,
  attachments,
}: {
  pathSlug: string;
  room?: Fields & { id: string };
  /** Mục tài liệu đính kèm, đặt trên thanh Lưu để giảng viên làm xong mọi thứ rồi mới lưu. */
  attachments?: React.ReactNode;
}) {
  const router = useRouter();
  const [fields, setFields] = useState<Fields>({
    title: room?.title ?? "",
    description: room?.description ?? "",
    content: room?.content ?? "",
  });
  const [confirmTemplate, setConfirmTemplate] = useState(false);
  // Thu gọn mặc định để ô soạn dài không chiếm chỗ; mở khi cần viết hoặc khi có lỗi.
  const [contentOpen, setContentOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>(
    {},
  );
  const [error, setError] = useState("");
  const [confirmLeave, setConfirmLeave] = useState(false);
  // Bản gốc lúc mở trang, không đổi trong suốt phiên soạn.
  const [initial] = useState(() => JSON.stringify(fields));
  // Có chữ chưa lưu (tên, mô tả, nội dung). Tài liệu đính kèm được lưu ngay khi tải lên.
  const dirty = JSON.stringify(fields) !== initial;
  const inFlight = useRef(false);
  const request = useRef<{ fingerprint: string; id: string } | null>(null);
  const back = `/gv/paths/${pathSlug}${room ? `/rooms/${room.id}` : ""}`;
  function change(key: keyof Fields, value: string) {
    setFields((previous) => ({ ...previous, [key]: value }));
    setConfirmLeave(false);
  }

  // Đóng tab hoặc tải lại trang khi còn thay đổi chưa lưu: trình duyệt hỏi lại.
  useEffect(() => {
    if (!dirty || pending) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, pending]);

  function cancel() {
    if (dirty && !confirmLeave) {
      setConfirmLeave(true);
      return;
    }
    router.push(back);
  }
  /** Khung 12 phần chỉ là mẫu gợi ý; ghi đè nội dung đang có thì phải xác nhận. */
  function applyTemplate() {
    if (fields.content.trim() && !confirmTemplate) {
      setConfirmTemplate(true);
      return;
    }
    change("content", lessonSkeleton(fields.title.trim() || "Bài học"));
    setConfirmTemplate(false);
    setContentOpen(true);
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
      if (next.content) setContentOpen(true);
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
        <div className="space-y-3 rounded-xl border bg-muted/20">
          <button
            type="button"
            onClick={() => setContentOpen(!contentOpen)}
            aria-expanded={contentOpen}
            aria-controls="lesson-content-panel"
            className="flex w-full items-center justify-between gap-3 rounded-xl p-4 text-left hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-ring"
          >
            <span className="min-w-0 space-y-0.5">
              <span className="block text-sm font-semibold">
                Nội dung bài học{" "}
                <span className="font-normal text-muted-foreground">
                  (không bắt buộc)
                </span>
              </span>
              <span className="block text-xs text-muted-foreground">
                {summarizeContent(fields.content)}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-primary">
              {contentOpen ? "Thu gọn" : "Mở để soạn"}
              <ChevronDown
                aria-hidden
                className={`size-4 transition-transform ${contentOpen ? "rotate-180" : ""}`}
              />
            </span>
          </button>
          <div
            id="lesson-content-panel"
            hidden={!contentOpen}
            className="space-y-3 px-4 pb-4"
          >
            <label htmlFor="lesson-content" className="sr-only">
              Nội dung bài học
            </label>
            <p
              id="lesson-content-help"
              className="text-xs text-muted-foreground"
            >
              Dùng thanh công cụ để định dạng, bên phải là bản xem trước đúng
              như học viên thấy. Có thể để trống nếu bài chỉ dùng slide/PDF ở
              mục Tài liệu đính kèm hoặc chỉ có bài tập.
            </p>
            {confirmTemplate && (
              <div
                role="alert"
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm"
              >
                <span>Thay toàn bộ nội dung đang có bằng khung mẫu?</span>
                <span className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirmTemplate(false)}
                  >
                    Giữ nội dung
                  </Button>
                  <Button type="button" size="sm" onClick={applyTemplate}>
                    Thay bằng khung mẫu
                  </Button>
                </span>
              </div>
            )}
            <MarkdownEditor
              id="lesson-content"
              value={fields.content}
              onChange={(value) => change("content", value)}
              invalid={!!errors.content}
              describedBy={`lesson-content-help${errors.content ? " lesson-content-error" : ""}`}
              disabled={pending}
              placeholder={
                "Để trống nếu bài chỉ có slide/PDF hoặc bài tập.\n\nHoặc gõ nội dung, dùng thanh công cụ phía trên để thêm tiêu đề, danh sách, code, video..."
              }
              actions={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={applyTemplate}
                >
                  <LayoutTemplate className="size-4" aria-hidden />
                  Khung mẫu {LESSON_PART_COUNT} phần
                </Button>
              }
            />
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
        </div>
        {attachments && <div className="border-t pt-5">{attachments}</div>}
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        {/* Thanh lưu ở cuối, dính đáy màn hình: làm xong mọi phần ở trên rồi bấm Lưu một lần. */}
        <div className="sticky bottom-0 z-10 -mx-4 -mb-4 space-y-2 rounded-b-2xl border-t bg-background/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6">
          {confirmLeave && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm"
            >
              <span>
                Bạn có thay đổi chưa lưu. Thoát và bỏ các thay đổi này?
              </span>
              <span className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmLeave(false)}
                >
                  Ở lại
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={cancel}
                >
                  Bỏ thay đổi
                </Button>
              </span>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {dirty ? (
                <span className="font-semibold text-warning">
                  Có thay đổi chưa lưu
                </span>
              ) : (
                "Chưa có thay đổi"
              )}
              {attachments && " · Tài liệu đính kèm được lưu ngay khi tải lên"}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="outline" onClick={cancel}>
                Hủy
              </Button>
              <Button type="submit">
                {pending ? (
                  <LoaderCircle className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Save className="size-4" aria-hidden />
                )}
                {pending
                  ? "Đang lưu..."
                  : room
                    ? "Lưu thay đổi"
                    : "Thêm bài học"}
              </Button>
            </div>
          </div>
        </div>
      </fieldset>
    </form>
  );
}
