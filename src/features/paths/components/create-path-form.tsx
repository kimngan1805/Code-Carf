"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BookOpen,
  BookPlus,
  Check,
  Clock,
  Info,
  LoaderCircle,
  Lock,
  Palette,
  Save,
  Settings2,
  Tags,
  Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { pathFieldsSchema, MAX_PATH_TAGS } from "../creation-schema";
import {
  COVER_THEMES,
  DIFFICULTY_LABELS,
  coverThemeClass,
} from "../cover-themes";
import { updatePathDetailsAction } from "../details-actions";
import { formatDuration } from "../format";
import { PathDifficultyBadge, PathStatusBadge } from "./path-badges";

type Existing = {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: keyof typeof DIFFICULTY_LABELS;
  tags: string[];
  estimatedMinutes: number | null;
  coverTheme: string;
  published?: boolean;
};

type FieldErrors = Partial<
  Record<"title" | "description" | "tags" | "hours", string>
>;

const DIFFICULTY_DESCRIPTIONS: Record<keyof typeof DIFFICULTY_LABELS, string> =
  {
    EASY: "Phù hợp người mới bắt đầu làm quen.",
    MEDIUM: "Dành cho học viên đã có nền tảng cơ bản.",
    HARD: "Thử thách chuyên sâu về tư duy và thuật toán.",
  };

const inputClass =
  "h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm shadow-xs transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 hover:border-muted-foreground/40 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-highlight/20 focus-visible:outline-none aria-invalid:border-destructive aria-invalid:ring-destructive/15";

/** Phân tích chuỗi chủ đề phân tách bằng dấu phẩy thành danh sách không trùng. */
export function parseTagPreview(raw: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

/** Tạo lộ trình mới, hoặc sửa thông tin hiển thị khi truyền `path`. */
export function CreatePathForm({ path }: { path?: Existing }) {
  const router = useRouter();
  const editing = !!path;
  const initialHours = path?.estimatedMinutes
    ? String(+(path.estimatedMinutes / 60).toFixed(1))
    : "";
  const initialTags = path?.tags.join(", ") ?? "";

  const [title, setTitle] = useState(path?.title ?? "");
  const [description, setDescription] = useState(path?.description ?? "");
  const [sequentialUnlock, setSequentialUnlock] = useState(true);
  const [difficulty, setDifficulty] = useState<keyof typeof DIFFICULTY_LABELS>(
    path?.difficulty ?? "EASY",
  );
  const [tags, setTags] = useState(initialTags);
  const [hours, setHours] = useState(initialHours);
  const [coverTheme, setCoverTheme] = useState(path?.coverTheme ?? "blue");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<FieldErrors>({});
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const inFlight = useRef(false);
  const navigatingRef = useRef(false);
  const request = useRef<{ fingerprint: string; id: string } | null>(null);

  const backHref = path ? `/gv/paths/${path.slug}` : "/gv/paths";

  const isDirty =
    title !== (path?.title ?? "") ||
    description !== (path?.description ?? "") ||
    difficulty !== (path?.difficulty ?? "EASY") ||
    tags !== initialTags ||
    hours !== initialHours ||
    coverTheme !== (path?.coverTheme ?? "blue") ||
    (!editing && sequentialUnlock !== true);

  useEffect(() => {
    if (!isDirty || pending) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (navigatingRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty, pending]);

  const parsedTags = useMemo(() => parseTagPreview(tags), [tags]);
  const previewMinutes = useMemo(() => {
    const trimmed = hours.trim();
    if (!trimmed) return null;
    const numeric = Number(trimmed);
    return numeric > 0 && Number.isFinite(numeric)
      ? Math.round(numeric * 60)
      : null;
  }, [hours]);

  function handleCancel() {
    if (isDirty) {
      setConfirmDiscard(true);
      return;
    }
    router.push(backHref);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    setError("");
    setFields({});
    setConfirmDiscard(false);

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
        navigatingRef.current = true;
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
      navigatingRef.current = true;
      router.push(
        `/gv/paths/${encodeURIComponent(result.data.slug)}?created=1`,
      );
      navigating = true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Mất kết nối. Vui lòng thử lại.",
      );
    } finally {
      if (!navigating) {
        inFlight.current = false;
        setPending(false);
      }
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_310px] lg:items-start">
      <form
        onSubmit={submit}
        noValidate
        aria-busy={pending}
        className="space-y-6"
      >
        <fieldset disabled={pending} className="space-y-6">
          {/* Section 1: Basic Info */}
          <section className="space-y-5 rounded-2xl border border-border/70 bg-background p-5 sm:p-6">
            <div className="flex items-start gap-3 border-b border-border/60 pb-4">
              <span
                aria-hidden
                className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary/70 text-primary"
              >
                <BookOpen className="size-4" />
              </span>
              <div>
                <h2 className="text-base font-bold text-foreground">
                  1. Thông tin cơ bản
                </h2>
                <p className="text-xs text-muted-foreground">
                  Tên và mô tả giúp học viên hiểu nhanh nội dung trọng tâm của
                  lộ trình.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="path-title"
                  className="text-sm font-semibold text-foreground"
                >
                  Tên lộ trình <span className="text-destructive">*</span>
                </label>
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    title.length > 90
                      ? "font-semibold text-warning"
                      : "text-muted-foreground",
                  )}
                >
                  {title.length}/100
                </span>
              </div>
              <input
                id="path-title"
                name="title"
                required
                maxLength={100}
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  if (fields.title)
                    setFields((prev) => ({ ...prev, title: undefined }));
                }}
                aria-invalid={!!fields.title}
                aria-describedby={
                  fields.title
                    ? "path-title-help path-title-error"
                    : "path-title-help"
                }
                placeholder="Ví dụ: Lập trình C++ cơ bản từ con số 0"
                className={inputClass}
              />
              <p id="path-title-help" className="text-xs text-muted-foreground">
                Ngắn gọn, rõ chủ đề và mục tiêu (tối đa 100 ký tự).
              </p>
              {fields.title && (
                <p
                  id="path-title-error"
                  role="alert"
                  className="text-xs font-medium text-destructive"
                >
                  {fields.title}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="path-description"
                  className="text-sm font-semibold text-foreground"
                >
                  Mô tả{" "}
                  <span className="font-normal text-muted-foreground">
                    (không bắt buộc)
                  </span>
                </label>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {description.length}/5.000
                </span>
              </div>
              <textarea
                id="path-description"
                name="description"
                rows={4}
                maxLength={5000}
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  if (fields.description)
                    setFields((prev) => ({ ...prev, description: undefined }));
                }}
                aria-invalid={!!fields.description}
                aria-describedby={
                  fields.description ? "path-description-error" : undefined
                }
                placeholder="Giới thiệu đối tượng học viên, kiến thức đạt được sau khi hoàn thành lộ trình..."
                className="block w-full resize-y rounded-xl border border-input bg-background p-3.5 text-sm leading-6 shadow-xs transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 hover:border-muted-foreground/40 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-highlight/20 focus-visible:outline-none aria-invalid:border-destructive"
              />
              {fields.description && (
                <p
                  id="path-description-error"
                  role="alert"
                  className="text-xs font-medium text-destructive"
                >
                  {fields.description}
                </p>
              )}
            </div>
          </section>

          {/* Section 2: Classification & Difficulty */}
          <section className="space-y-5 rounded-2xl border border-border/70 bg-background p-5 sm:p-6">
            <div className="flex items-start gap-3 border-b border-border/60 pb-4">
              <span
                aria-hidden
                className="grid size-9 shrink-0 place-items-center rounded-xl bg-highlight/15 text-primary"
              >
                <Tags className="size-4" />
              </span>
              <div>
                <h2 className="text-base font-bold text-foreground">
                  2. Phân loại và độ khó
                </h2>
                <p className="text-xs text-muted-foreground">
                  Giúp học viên tìm kiếm và chọn đúng lộ trình phù hợp trình độ.
                </p>
              </div>
            </div>

            <fieldset className="space-y-2.5">
              <legend className="text-sm font-semibold text-foreground">
                Độ khó <span className="text-destructive">*</span>
              </legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {(
                  Object.entries(DIFFICULTY_LABELS) as [
                    keyof typeof DIFFICULTY_LABELS,
                    string,
                  ][]
                ).map(([value, label]) => {
                  const selected = difficulty === value;
                  return (
                    <label
                      key={value}
                      className={cn(
                        "relative flex cursor-pointer flex-col gap-1 rounded-xl border p-3.5 transition-colors",
                        selected
                          ? "border-primary bg-secondary/35 ring-2 ring-highlight/25"
                          : "border-border/80 bg-background hover:border-primary/40 hover:bg-muted/30",
                      )}
                    >
                      <input
                        type="radio"
                        name="difficulty"
                        value={value}
                        checked={selected}
                        onChange={() => setDifficulty(value)}
                        className="peer sr-only"
                      />
                      <span className="flex items-center justify-between gap-2 text-sm font-semibold text-foreground">
                        {label}
                        {selected && (
                          <span
                            aria-hidden
                            className="grid size-5 place-items-center rounded-full bg-primary text-primary-foreground"
                          >
                            <Check className="size-3" />
                          </span>
                        )}
                      </span>
                      <span className="text-xs leading-5 text-muted-foreground">
                        {DIFFICULTY_DESCRIPTIONS[value]}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="path-hours"
                  className="text-sm font-semibold text-foreground"
                >
                  Thời lượng ước tính{" "}
                  <span className="font-normal text-muted-foreground">
                    (không bắt buộc)
                  </span>
                </label>
                <div className="relative">
                  <input
                    id="path-hours"
                    inputMode="decimal"
                    value={hours}
                    onChange={(event) => {
                      setHours(event.target.value);
                      if (fields.hours)
                        setFields((prev) => ({ ...prev, hours: undefined }));
                    }}
                    aria-invalid={!!fields.hours}
                    aria-describedby={
                      fields.hours
                        ? "path-hours-help path-hours-error"
                        : "path-hours-help"
                    }
                    placeholder="Ví dụ: 12"
                    className={cn(inputClass, "pr-12")}
                  />
                  <span
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-xs font-semibold text-muted-foreground"
                  >
                    giờ
                  </span>
                </div>
                <p
                  id="path-hours-help"
                  className="text-xs text-muted-foreground"
                >
                  Từ 0.1 giờ (5 phút) đến tối đa 100 giờ.
                </p>
                {fields.hours && (
                  <p
                    id="path-hours-error"
                    role="alert"
                    className="text-xs font-medium text-destructive"
                  >
                    {fields.hours}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="path-tags"
                    className="text-sm font-semibold text-foreground"
                  >
                    Chủ đề{" "}
                    <span className="font-normal text-muted-foreground">
                      (không bắt buộc)
                    </span>
                  </label>
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      parsedTags.length > MAX_PATH_TAGS
                        ? "font-semibold text-destructive"
                        : "text-muted-foreground",
                    )}
                  >
                    {parsedTags.length}/{MAX_PATH_TAGS}
                  </span>
                </div>
                <input
                  id="path-tags"
                  value={tags}
                  onChange={(event) => {
                    setTags(event.target.value);
                    if (fields.tags)
                      setFields((prev) => ({ ...prev, tags: undefined }));
                  }}
                  aria-invalid={!!fields.tags}
                  aria-describedby={
                    fields.tags
                      ? "path-tags-help path-tags-error"
                      : "path-tags-help"
                  }
                  placeholder="C++, nhập môn, thuật toán"
                  className={inputClass}
                />
                <p
                  id="path-tags-help"
                  className="text-xs text-muted-foreground"
                >
                  Phân cách bằng dấu phẩy, tối đa {MAX_PATH_TAGS} chủ đề.
                </p>
                {fields.tags && (
                  <p
                    id="path-tags-error"
                    role="alert"
                    className="text-xs font-medium text-destructive"
                  >
                    {fields.tags}
                  </p>
                )}
              </div>
            </div>

            {parsedTags.length > 0 && (
              <ul
                className="flex flex-wrap gap-1.5"
                aria-label="Xem trước chủ đề"
              >
                {parsedTags.map((tag, index) => (
                  <li
                    key={`${tag}-${index}`}
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium",
                      index >= MAX_PATH_TAGS
                        ? "bg-destructive/10 text-destructive"
                        : "bg-secondary/60 text-secondary-foreground",
                    )}
                  >
                    #{tag}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Section 3: Visual Cover Theme */}
          <section className="space-y-5 rounded-2xl border border-border/70 bg-background p-5 sm:p-6">
            <div className="flex items-start gap-3 border-b border-border/60 pb-4">
              <span
                aria-hidden
                className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent-strong"
              >
                <Palette className="size-4" />
              </span>
              <div>
                <h2 className="text-base font-bold text-foreground">
                  3. Hình ảnh và diện mạo
                </h2>
                <p className="text-xs text-muted-foreground">
                  Chọn tông màu bìa hiển thị trên thẻ lộ trình và trang tổng
                  quan.
                </p>
              </div>
            </div>

            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-foreground">
                Màu bìa lộ trình
              </legend>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {COVER_THEMES.map((theme) => {
                  const selected = coverTheme === theme.key;
                  return (
                    <label
                      key={theme.key}
                      className={cn(
                        "group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-background transition-all",
                        selected
                          ? "border-primary ring-2 ring-highlight/30"
                          : "border-border/80 hover:border-primary/40",
                      )}
                    >
                      <input
                        type="radio"
                        name="coverTheme"
                        value={theme.key}
                        checked={selected}
                        onChange={() => setCoverTheme(theme.key)}
                        className="peer sr-only"
                      />
                      <span
                        aria-hidden
                        className={cn(
                          "relative block h-14 w-full bg-gradient-to-br",
                          theme.className,
                        )}
                      >
                        {selected && (
                          <span className="absolute top-2 right-2 grid size-5 place-items-center rounded-full bg-background text-primary shadow-xs">
                            <Check className="size-3.5" />
                          </span>
                        )}
                      </span>
                      <span className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-foreground">
                        {theme.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </section>

          {/* Section 4: Learning Configuration */}
          <section className="space-y-4 rounded-2xl border border-border/70 bg-background p-5 sm:p-6">
            <div className="flex items-start gap-3 border-b border-border/60 pb-4">
              <span
                aria-hidden
                className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary/70 text-primary"
              >
                <Settings2 className="size-4" />
              </span>
              <div>
                <h2 className="text-base font-bold text-foreground">
                  4. Cấu hình học tập
                </h2>
                <p className="text-xs text-muted-foreground">
                  Thiết lập quy tắc tiếp cận bài học dành cho học viên đăng ký.
                </p>
              </div>
            </div>

            {!editing ? (
              <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-border/70 bg-muted/25 p-4 transition-colors hover:border-primary/35">
                <span className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className={cn(
                      "mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl",
                      sequentialUnlock
                        ? "bg-secondary/70 text-primary"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {sequentialUnlock ? (
                      <Lock className="size-4" />
                    ) : (
                      <Unlock className="size-4" />
                    )}
                  </span>
                  <span className="space-y-1">
                    <span className="block text-sm font-semibold text-foreground">
                      Mở khóa bài học theo thứ tự
                    </span>
                    <span className="block text-xs leading-5 text-muted-foreground">
                      {sequentialUnlock
                        ? "Học viên cần hoàn thành bài học trước để mở bài tiếp theo. Bạn vẫn có thể đổi lại sau khi tạo."
                        : "Học viên có thể mở bất kỳ bài học nào trong lộ trình sau khi đăng ký."}
                    </span>
                  </span>
                </span>

                <span className="relative mt-0.5 inline-flex shrink-0 items-center">
                  <input
                    type="checkbox"
                    role="switch"
                    name="sequentialUnlock"
                    checked={sequentialUnlock}
                    onChange={(event) =>
                      setSequentialUnlock(event.target.checked)
                    }
                    className="peer sr-only"
                  />
                  <span
                    aria-hidden
                    className={cn(
                      "h-6 w-11 rounded-full border transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
                      sequentialUnlock
                        ? "border-primary bg-primary"
                        : "border-border bg-muted",
                    )}
                  />
                  <span
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute left-0.5 size-5 rounded-full bg-background shadow-xs transition-transform",
                      sequentialUnlock ? "translate-x-5" : "translate-x-0",
                    )}
                  />
                </span>
              </label>
            ) : (
              <div className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/30 p-4 text-xs leading-5 text-muted-foreground">
                <Info
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  aria-hidden
                />
                <p>
                  Cấu hình <strong>mở khóa bài học tuần tự</strong> và{" "}
                  <strong>trạng thái xuất bản</strong> được quản lý trực tiếp
                  tại{" "}
                  <Link
                    href={backHref}
                    className="font-semibold text-primary hover:underline"
                  >
                    trang tổng quan lộ trình
                  </Link>
                  .
                </p>
              </div>
            )}
          </section>

          {/* Error Banner */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm font-medium text-destructive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>{error}</p>
            </div>
          )}

          {/* Unsaved Changes Inline Confirmation */}
          {confirmDiscard && (
            <div
              role="alert"
              className="flex flex-col gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-sm font-medium text-foreground">
                Bạn có thay đổi chưa được lưu. Bạn có chắc muốn rời khỏi trang?
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmDiscard(false)}
                  className="border-border bg-background text-foreground"
                >
                  Tiếp tục chỉnh sửa
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    navigatingRef.current = true;
                    router.push(backHref);
                  }}
                >
                  Bỏ thay đổi
                </Button>
              </div>
            </div>
          )}

          {/* Action Bar */}
          <div className="flex flex-col-reverse gap-3 rounded-2xl border border-border/70 bg-background p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-xs text-muted-foreground">
              {isDirty
                ? "Có thay đổi chưa lưu."
                : editing
                  ? "Mọi thông tin đang trùng khớp với bản đã lưu."
                  : "Lộ trình mới sẽ được tạo ở trạng thái Bản nháp."}
            </p>
            <div className="flex flex-col-reverse gap-2.5 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={handleCancel}
                className="rounded-xl border-border bg-background text-foreground hover:bg-muted"
              >
                Hủy
              </Button>
              <Button type="submit" disabled={pending} className="rounded-xl">
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
          </div>
        </fieldset>
      </form>

      {/* Sticky Live Card Preview */}
      <aside
        aria-label="Xem trước thẻ lộ trình"
        className="space-y-3 lg:sticky lg:top-24"
      >
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Xem trước hiển thị
        </p>
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-background shadow-xs">
          <div
            className={cn(
              "relative flex h-24 items-start justify-between gap-2 overflow-hidden bg-gradient-to-br p-3.5",
              coverThemeClass(coverTheme),
            )}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -right-5 -bottom-8 size-24 rounded-full bg-primary-foreground/15"
            />
            <PathStatusBadge
              published={path?.published ?? false}
              surface="elevated"
            />
            <PathDifficultyBadge difficulty={difficulty} surface="elevated" />
          </div>
          <div className="space-y-3 p-4">
            <h3 className="line-clamp-2 text-base font-bold text-foreground break-words">
              {title.trim() || "Tên lộ trình của bạn"}
            </h3>
            <p className="line-clamp-3 text-xs leading-5 text-muted-foreground break-words">
              {description.trim() ||
                "Mô tả ngắn sẽ xuất hiện ở đây giúp học viên hiểu nội dung của lộ trình."}
            </p>
            {parsedTags.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {parsedTags.slice(0, MAX_PATH_TAGS).map((tag, index) => (
                  <li
                    key={`preview-${tag}-${index}`}
                    className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                  >
                    #{tag}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" aria-hidden />
                {formatDuration(previewMinutes) || "Chưa đặt thời lượng"}
              </span>
              {!editing && (
                <span className="inline-flex items-center gap-1">
                  {sequentialUnlock ? (
                    <Lock className="size-3.5" aria-hidden />
                  ) : (
                    <Unlock className="size-3.5" aria-hidden />
                  )}
                  {sequentialUnlock ? "Mở tuần tự" : "Mở tự do"}
                </span>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
