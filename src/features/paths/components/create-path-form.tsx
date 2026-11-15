"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookPlus, LoaderCircle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { pathFieldsSchema, MAX_PATH_TAGS } from "../creation-schema";
import {
  COVER_THEMES,
  DIFFICULTY_LABELS,
  coverThemeClass,
} from "../cover-themes";
import { updatePathDetailsAction } from "../details-actions";

type Existing = {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: keyof typeof DIFFICULTY_LABELS;
  tags: string[];
  estimatedMinutes: number | null;
  coverTheme: string;
};
type FieldErrors = Partial<
  Record<"title" | "description" | "tags" | "hours", string>
>;

const inputClass =
  "h-11 w-full rounded-lg border bg-background px-3 text-sm focus-visible:outline-2";

/** Tạo lộ trình mới, hoặc sửa thông tin hiển thị khi truyền `path`. */
export function CreatePathForm({ path }: { path?: Existing }) {
  const router = useRouter();
  const editing = !!path;
  const [title, setTitle] = useState(path?.title ?? "");
  const [description, setDescription] = useState(path?.description ?? "");
  const [sequentialUnlock, setSequentialUnlock] = useState(true);
  const [difficulty, setDifficulty] = useState(path?.difficulty ?? "EASY");
  const [tags, setTags] = useState(path?.tags.join(", ") ?? "");
  const [hours, setHours] = useState(
    path?.estimatedMinutes
      ? String(+(path.estimatedMinutes / 60).toFixed(1))
      : "",
  );
  const [coverTheme, setCoverTheme] = useState(path?.coverTheme ?? "blue");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<FieldErrors>({});
  const inFlight = useRef(false);
  const request = useRef<{ fingerprint: string; id: string } | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    setError("");
    setFields({});
    const hoursValue = hours.trim();
    if (hoursValue && !(Number(hoursValue) > 0)) {
      setFields({ hours: "Thời lượng phải là một số lớn hơn 0 (giờ)." });
      return;
    }
    const parsed = pathFieldsSchema.safeParse({
      title,
      description,
      sequentialUnlock,
      difficulty,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      estimatedMinutes: hoursValue ? Math.round(Number(hoursValue) * 60) : null,
      coverTheme,
    });
    if (!parsed.success) {
      const next: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === "title") next.title ??= issue.message;
        else if (key === "description") next.description ??= issue.message;
        else if (key === "tags") next.tags ??= issue.message;
        else if (key === "estimatedMinutes") next.hours ??= issue.message;
        else setError(issue.message);
      }
      setFields(next);
      return;
    }
    inFlight.current = true;
    setPending(true);
    let navigating = false;
    try {
      if (path) {
        const { sequentialUnlock: _unused, ...details } = parsed.data;
        void _unused;
        const result = await updatePathDetailsAction({
          ...details,
          pathId: path.id,
        });
        if (result.error || !result.data) {
          setError(result.error ?? "Chưa thể lưu thông tin lộ trình.");
          return;
        }
        router.push(
          `/gv/paths/${encodeURIComponent(result.data.slug)}?saved=1`,
        );
        router.refresh();
        navigating = true;
        return;
      }
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
            className={inputClass}
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="path-difficulty" className="text-sm font-semibold">
              Độ khó <span className="text-destructive">*</span>
            </label>
            <select
              id="path-difficulty"
              value={difficulty}
              onChange={(event) =>
                setDifficulty(event.target.value as typeof difficulty)
              }
              className={inputClass}
            >
              {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="path-hours" className="text-sm font-semibold">
              Thời lượng ước tính (giờ){" "}
              <span className="font-normal text-muted-foreground">
                (không bắt buộc)
              </span>
            </label>
            <input
              id="path-hours"
              inputMode="decimal"
              value={hours}
              onChange={(event) => setHours(event.target.value)}
              aria-invalid={!!fields.hours}
              aria-describedby={fields.hours ? "path-hours-error" : undefined}
              placeholder="Ví dụ: 12"
              className={inputClass}
            />
            {fields.hours && (
              <p
                id="path-hours-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {fields.hours}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="path-tags" className="text-sm font-semibold">
            Chủ đề{" "}
            <span className="font-normal text-muted-foreground">
              (tối đa {MAX_PATH_TAGS}, cách nhau bằng dấu phẩy)
            </span>
          </label>
          <input
            id="path-tags"
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            aria-invalid={!!fields.tags}
            aria-describedby={fields.tags ? "path-tags-error" : undefined}
            placeholder="Ví dụ: C++, nhập môn, thuật toán"
            className={inputClass}
          />
          {fields.tags && (
            <p
              id="path-tags-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {fields.tags}
            </p>
          )}
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Ảnh bìa</legend>
          <div className="flex flex-wrap gap-3">
            {COVER_THEMES.map((theme) => (
              <label key={theme.key} className="cursor-pointer">
                <input
                  type="radio"
                  name="coverTheme"
                  value={theme.key}
                  checked={coverTheme === theme.key}
                  onChange={() => setCoverTheme(theme.key)}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    "block h-12 w-20 rounded-lg bg-gradient-to-br ring-offset-2 ring-offset-background peer-checked:ring-2 peer-checked:ring-primary peer-focus-visible:outline-2",
                    theme.className,
                  )}
                  title={theme.label}
                >
                  <span className="sr-only">{theme.label}</span>
                </span>
              </label>
            ))}
          </div>
          <div
            aria-hidden
            className={cn(
              "h-16 rounded-xl bg-gradient-to-br",
              coverThemeClass(coverTheme),
            )}
          />
        </fieldset>

        {!editing && (
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
        )}
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
            onClick={() =>
              router.push(path ? `/gv/paths/${path.slug}` : "/gv/paths")
            }
          >
            Hủy
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? (
              <LoaderCircle aria-hidden className="size-4 animate-spin" />
            ) : editing ? (
              <Save aria-hidden className="size-4" />
            ) : (
              <BookPlus aria-hidden className="size-4" />
            )}
            {pending
              ? editing
                ? "Đang lưu..."
                : "Đang tạo..."
              : editing
                ? "Lưu thay đổi"
                : "Tạo lộ trình"}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
