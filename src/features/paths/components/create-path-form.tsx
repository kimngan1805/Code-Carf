"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  BookPlus,
  Check,
  Circle,
  Clock,
  Info,
  Layers,
  LoaderCircle,
  Lock,
  Plus,
  Save,
  Trash2,
  Unlock,
  Globe,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { pathFieldsSchema, MAX_PATH_TAGS } from "../creation-schema";
import { COVER_THEMES, DIFFICULTY_LABELS } from "../cover-themes";
import { updatePathDetailsAction } from "../details-actions";
import { formatDuration } from "../format";
import {
  LESSON_PART_COUNT,
  LESSON_PHASES,
  PHASE_OFFSETS,
  lessonSkeleton,
} from "../lesson-structure";
import { saveLessonAction } from "@/features/rooms/authoring-actions";
import { changePathPublication } from "../publication-actions";
import {
  PATH_VISIBILITIES,
  SAMPLE_CLASSES,
  type PathVisibility,
} from "../visibility";
import { DifficultyChip, PathArt } from "./path-showcase";

type Difficulty = keyof typeof DIFFICULTY_LABELS;

type Existing = {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  tags: string[];
  estimatedMinutes: number | null;
  coverTheme: string;
  published?: boolean;
};

/** Bài học nháp trong đề cương; `requestId` cố định để bấm lại không tạo trùng. */
type DraftLesson = {
  key: string;
  requestId: string;
  title: string;
  description: string;
};

type FieldErrors = Partial<
  Record<
    "title" | "description" | "tags" | "hours" | "lessons" | "visibility",
    string
  >
>;

export const MAX_DRAFT_LESSONS = 30;

const VISIBILITY_ICONS: Record<PathVisibility, LucideIcon> = {
  private: UserRound,
  class: UsersRound,
  public: Globe,
};

const DIFFICULTY_DESCRIPTIONS: Record<Difficulty, string> = {
  EASY: "Người mới bắt đầu làm quen.",
  MEDIUM: "Đã có nền tảng cơ bản.",
  HARD: "Chuyên sâu về tư duy và thuật toán.",
};

const inputClass =
  "h-11 w-full rounded-xl border-2 border-input bg-background px-3.5 text-sm transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 hover:border-primary/40 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-highlight/20 focus-visible:outline-none aria-invalid:border-destructive aria-invalid:ring-destructive/15";

const textareaClass =
  "block w-full resize-y rounded-xl border-2 border-input bg-background p-3.5 text-sm leading-6 transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 hover:border-primary/40 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-highlight/20 focus-visible:outline-none aria-invalid:border-destructive";

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

const newLesson = (): DraftLesson => ({
  key: crypto.randomUUID(),
  requestId: crypto.randomUUID(),
  title: "",
  description: "",
});

function Section({
  step,
  title,
  hint,
  shows,
  children,
}: {
  step: number;
  title: string;
  hint: string;
  /** Phần tương ứng trên trang chi tiết công khai. */
  shows?: string;
  children: React.ReactNode;
}) {
  const id = `path-section-${step}`;
  return (
    <section
      aria-labelledby={id}
      className="space-y-5 rounded-3xl border-2 border-primary/15 bg-background p-5 sm:p-7"
    >
      <header className="flex items-start gap-4">
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-xl border-2 border-primary bg-brand-sky-light text-sm font-bold text-primary"
        >
          {String(step).padStart(2, "0")}
        </span>
        <div className="min-w-0">
          <h2 id={id} className="text-lg font-bold text-foreground">
            {step}. {title}
          </h2>
          <p className="text-sm text-muted-foreground">{hint}</p>
          {shows && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-secondary/40 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              <Layers aria-hidden className="size-3" />
              Hiện ở: {shows}
            </p>
          )}
        </div>
      </header>
      {children}
    </section>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-xs font-medium text-destructive">
      {message}
    </p>
  );
}

function Counter({ value, max }: { value: number; max: number }) {
  return (
    <span
      className={cn(
        "text-xs tabular-nums",
        value > max * 0.9
          ? "font-semibold text-warning"
          : "text-muted-foreground",
      )}
    >
      {value}/{max.toLocaleString("vi-VN")}
    </span>
  );
}

/** Tạo lộ trình mới (kèm đề cương), hoặc sửa thông tin hiển thị khi truyền `path`. */
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
  const [difficulty, setDifficulty] = useState<Difficulty>(
    path?.difficulty ?? "EASY",
  );
  const [tags, setTags] = useState(initialTags);
  const [hours, setHours] = useState(initialHours);
  const [coverTheme, setCoverTheme] = useState(path?.coverTheme ?? "blue");
  const [lessons, setLessons] = useState<DraftLesson[]>([]);
  // Khung 12 phần là mẫu gợi ý, giảng viên tự chọn dùng; bài có thể chỉ cần tiêu đề + slide.
  const [scaffold, setScaffold] = useState(false);
  const [visibility, setVisibility] = useState<PathVisibility>("private");
  const [classes, setClasses] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [fields, setFields] = useState<FieldErrors>({});
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const inFlight = useRef(false);
  const navigatingRef = useRef(false);
  const request = useRef<{ fingerprint: string; id: string } | null>(null);
  /** Slug của lộ trình đã tạo, để bấm lại chỉ tạo nốt các bài còn thiếu. */
  const created = useRef<{ id: string; slug: string } | null>(null);
  const savedLessons = useRef(new Set<string>());

  const backHref = path ? `/gv/paths/${path.slug}` : "/gv/paths";

  const isDirty =
    title !== (path?.title ?? "") ||
    description !== (path?.description ?? "") ||
    difficulty !== (path?.difficulty ?? "EASY") ||
    tags !== initialTags ||
    hours !== initialHours ||
    coverTheme !== (path?.coverTheme ?? "blue") ||
    (!editing &&
      (sequentialUnlock !== true ||
        lessons.length > 0 ||
        visibility !== "private"));

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
  const namedLessons = lessons.filter((lesson) => lesson.title.trim());

  function updateLesson(key: string, change: Partial<DraftLesson>) {
    setLessons((all) =>
      all.map((lesson) =>
        lesson.key === key ? { ...lesson, ...change } : lesson,
      ),
    );
    if (fields.lessons) setFields((prev) => ({ ...prev, lessons: undefined }));
  }

  function moveLesson(index: number, by: -1 | 1) {
    setLessons((all) => {
      const next = [...all];
      const [lesson] = next.splice(index, 1);
      next.splice(index + by, 0, lesson);
      return next;
    });
  }

  function handleCancel() {
    if (isDirty) {
      setConfirmDiscard(true);
      return;
    }
    router.push(backHref);
  }

  async function createPath(data: unknown) {
    if (created.current) return created.current;
    const fingerprint = JSON.stringify(data);
    if (request.current?.fingerprint !== fingerprint)
      request.current = { fingerprint, id: crypto.randomUUID() };
    const response = await fetch("/api/paths", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(data as object),
        requestId: request.current.id,
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      if (result.error?.code === "CREATION_REQUEST_REUSED")
        request.current = null;
      throw new Error(
        result.error?.message ?? "Chưa thể tạo lộ trình. Vui lòng thử lại.",
      );
    }
    created.current = { id: result.data.id, slug: result.data.slug };
    return created.current;
  }

  async function createLessons(slug: string) {
    for (const [index, lesson] of namedLessons.entries()) {
      if (savedLessons.current.has(lesson.key)) continue;
      setProgress(`Đang tạo bài ${index + 1}/${namedLessons.length}...`);
      const name = lesson.title.trim();
      const result = await saveLessonAction({
        pathSlug: slug,
        requestId: lesson.requestId,
        title: name,
        description: lesson.description.trim(),
        content: scaffold ? lessonSkeleton(name) : "",
      });
      if (result.error)
        throw new Error(
          `Đã tạo lộ trình nhưng chưa lưu được bài "${name}": ${result.error} Bấm "Tạo lộ trình" để thử lại phần còn thiếu.`,
        );
      savedLessons.current.add(lesson.key);
    }
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
    if (lessons.some((lesson) => !lesson.title.trim() && lesson.description)) {
      setFields({ lessons: "Bài học có mục tiêu thì cần có tên bài." });
      return;
    }
    if (!editing && visibility === "class" && classes.length === 0) {
      setFields({ visibility: "Chọn ít nhất 1 lớp được xem lộ trình." });
      return;
    }
    if (!editing && visibility === "public" && namedLessons.length === 0) {
      setFields({
        visibility:
          "Cần ít nhất 1 bài học trong đề cương để đưa lên trang khám phá.",
      });
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

      setProgress("Đang tạo lộ trình...");
      const { id, slug } = await createPath(parsed.data);
      await createLessons(slug);
      if (visibility === "public") {
        setProgress("Đang đưa lên trang khám phá...");
        const published = await changePathPublication({
          pathId: id,
          published: true,
        });
        if (published.error)
          throw new Error(
            `Đã tạo lộ trình ở chế độ Cá nhân nhưng chưa đưa lên trang khám phá được: ${published.error}`,
          );
      }
      navigatingRef.current = true;
      router.push(`/gv/paths/${encodeURIComponent(slug)}?created=1`);
      navigating = true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Mất kết nối. Vui lòng thử lại.",
      );
    } finally {
      if (!navigating) {
        inFlight.current = false;
        setPending(false);
        setProgress("");
      }
    }
  }

  const checklist = [
    { done: !!title.trim(), label: "Tên lộ trình" },
    { done: !!description.trim(), label: "Mô tả giới thiệu" },
    { done: parsedTags.length > 0, label: "Chủ đề để lọc" },
    { done: previewMinutes !== null, label: "Thời lượng ước tính" },
    ...(editing
      ? []
      : [{ done: namedLessons.length > 0, label: "Ít nhất 1 bài học" }]),
  ];
  const ready = checklist.filter((item) => item.done).length;

  let step = 0;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-start">
      <form
        onSubmit={submit}
        noValidate
        aria-busy={pending}
        className="space-y-6"
      >
        <fieldset disabled={pending} className="space-y-6">
          <Section
            step={++step}
            title="Giới thiệu lộ trình"
            hint="Ấn tượng đầu tiên của học viên: tên và lời giới thiệu ngắn."
            shows="đầu trang chi tiết và thẻ lộ trình"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="path-title"
                  className="text-sm font-semibold text-foreground"
                >
                  Tên lộ trình <span className="text-destructive">*</span>
                </label>
                <Counter value={title.length} max={100} />
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
                aria-describedby="path-title-help path-title-error"
                placeholder="Ví dụ: Lập trình C++ cơ bản từ con số 0"
                className={inputClass}
              />
              <p id="path-title-help" className="text-xs text-muted-foreground">
                Ngắn gọn, rõ chủ đề và mục tiêu.
              </p>
              <FieldError id="path-title-error" message={fields.title} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="path-description"
                  className="text-sm font-semibold text-foreground"
                >
                  Mô tả giới thiệu{" "}
                  <span className="font-normal text-muted-foreground">
                    (không bắt buộc)
                  </span>
                </label>
                <Counter value={description.length} max={5000} />
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
                aria-describedby="path-description-help path-description-error"
                placeholder="Lộ trình dành cho ai, học xong làm được gì..."
                className={textareaClass}
              />
              <p
                id="path-description-help"
                className="text-xs text-muted-foreground"
              >
                Hai câu đầu được hiện trên thẻ ở trang khám phá.
              </p>
              <FieldError
                id="path-description-error"
                message={fields.description}
              />
            </div>
          </Section>

          <Section
            step={++step}
            title="Phân loại"
            hint="Giúp học viên lọc và chọn đúng lộ trình hợp trình độ."
            shows="bộ lọc trang khám phá và thẻ tóm tắt"
          >
            <fieldset className="space-y-2.5">
              <legend className="text-sm font-semibold text-foreground">
                Độ khó <span className="text-destructive">*</span>
              </legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {(
                  Object.entries(DIFFICULTY_LABELS) as [Difficulty, string][]
                ).map(([value, label]) => {
                  const selected = difficulty === value;
                  return (
                    <label
                      key={value}
                      className={cn(
                        "relative flex cursor-pointer flex-col gap-1 rounded-2xl border-2 p-3.5 transition-all has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring",
                        selected
                          ? "border-primary bg-secondary/30 shadow-[3px_3px_0_0_var(--brand-blue)]"
                          : "border-border hover:border-primary/40",
                      )}
                    >
                      <input
                        type="radio"
                        name="difficulty"
                        value={value}
                        checked={selected}
                        onChange={() => setDifficulty(value)}
                        className="sr-only"
                      />
                      <span className="flex items-center justify-between gap-2">
                        <DifficultyChip difficulty={value} />
                        {selected && (
                          <Check
                            aria-hidden
                            className="size-4 text-primary"
                            strokeWidth={3}
                          />
                        )}
                      </span>
                      <span className="sr-only">{label}</span>
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
                    aria-describedby="path-hours-help path-hours-error"
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
                  Từ 0.1 giờ (5 phút) đến 100 giờ.
                </p>
                <FieldError id="path-hours-error" message={fields.hours} />
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
                  aria-describedby="path-tags-help path-tags-error"
                  placeholder="C++, nhập môn, thuật toán"
                  className={inputClass}
                />
                <p
                  id="path-tags-help"
                  className="text-xs text-muted-foreground"
                >
                  Phân cách bằng dấu phẩy, tối đa {MAX_PATH_TAGS} chủ đề.
                </p>
                <FieldError id="path-tags-error" message={fields.tags} />
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
                      "rounded-full border-2 px-2.5 py-0.5 text-xs font-semibold",
                      index >= MAX_PATH_TAGS
                        ? "border-destructive/30 bg-destructive/10 text-destructive"
                        : "border-primary/20 text-primary",
                    )}
                  >
                    #{tag}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {!editing && (
            <Section
              step={++step}
              title="Đề cương và mục tiêu"
              hint="Liệt kê các bài học theo thứ tự. Mục tiêu của từng bài chính là những gì học viên sẽ học được."
              shows="“Bạn sẽ học được gì” và “Nội dung lộ trình”"
            >
              {lessons.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-primary/25 p-6 text-center">
                  <BookOpen
                    aria-hidden
                    className="mx-auto size-8 text-primary/50"
                  />
                  <p className="mt-2 text-sm font-semibold">
                    Chưa có bài học nào
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Có thể bỏ qua và thêm sau, nhưng lộ trình cần ít nhất 1 bài
                    để xuất bản.
                  </p>
                </div>
              ) : (
                <ol className="space-y-3">
                  {lessons.map((lesson, index) => (
                    <li
                      key={lesson.key}
                      className="rounded-2xl border-2 border-primary/15 p-4 transition-colors focus-within:border-primary"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          aria-hidden
                          className="mt-1 grid size-9 shrink-0 place-items-center rounded-xl bg-brand-sky-light/70 text-sm font-bold text-primary"
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0 flex-1 space-y-2">
                          <label
                            className="sr-only"
                            htmlFor={`${lesson.key}-t`}
                          >
                            Tên bài {index + 1}
                          </label>
                          <input
                            id={`${lesson.key}-t`}
                            value={lesson.title}
                            maxLength={100}
                            onChange={(event) =>
                              updateLesson(lesson.key, {
                                title: event.target.value,
                              })
                            }
                            placeholder={`Tên bài ${index + 1}, ví dụ: Biến và kiểu dữ liệu`}
                            className={cn(inputClass, "h-10 font-semibold")}
                          />
                          <label
                            className="sr-only"
                            htmlFor={`${lesson.key}-d`}
                          >
                            Mục tiêu bài {index + 1}
                          </label>
                          <input
                            id={`${lesson.key}-d`}
                            value={lesson.description}
                            maxLength={300}
                            onChange={(event) =>
                              updateLesson(lesson.key, {
                                description: event.target.value,
                              })
                            }
                            placeholder="Học xong bài này, học viên có thể..."
                            className={cn(inputClass, "h-10")}
                          />
                        </div>
                        <div className="flex shrink-0 flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => moveLesson(index, -1)}
                            disabled={index === 0}
                            aria-label={`Đưa bài ${index + 1} lên trên`}
                            className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                          >
                            <ArrowUp aria-hidden className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveLesson(index, 1)}
                            disabled={index === lessons.length - 1}
                            aria-label={`Đưa bài ${index + 1} xuống dưới`}
                            className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
                          >
                            <ArrowDown aria-hidden className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setLessons((all) =>
                                all.filter((item) => item.key !== lesson.key),
                              )
                            }
                            aria-label={`Xóa bài ${index + 1}`}
                            className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 aria-hidden className="size-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              <FieldError id="path-lessons-error" message={fields.lessons} />
              <Button
                type="button"
                variant="outline"
                disabled={lessons.length >= MAX_DRAFT_LESSONS}
                onClick={() => setLessons((all) => [...all, newLesson()])}
                className="w-full rounded-xl border-2 border-dashed border-primary/40 text-primary hover:border-primary hover:bg-secondary/30"
              >
                <Plus aria-hidden className="size-4" />
                Thêm bài học
              </Button>

              <div className="rounded-2xl bg-muted/40 p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={scaffold}
                    onChange={(event) => setScaffold(event.target.checked)}
                    className="mt-1 size-4 accent-primary"
                  />
                  <span>
                    <span className="block text-sm font-semibold">
                      Dùng khung mẫu {LESSON_PART_COUNT} phần cho mỗi bài (không
                      bắt buộc)
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Gợi ý cách trình bày bài học, bạn điền tiếp trong trình
                      soạn bài. Không chọn thì bài chỉ cần tiêu đề, sau đó thêm
                      slide/PDF, video hoặc bài tập.
                    </span>
                  </span>
                </label>
                <ol
                  className={cn(
                    "mt-4 grid gap-3 sm:grid-cols-2",
                    !scaffold && "opacity-40",
                  )}
                >
                  {LESSON_PHASES.map((phase, phaseIndex) => (
                    <li
                      key={phase.title}
                      className={cn("rounded-xl p-3", phase.tone)}
                    >
                      <p className="text-xs font-bold">
                        {phase.title}
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          · {phase.summary}
                        </span>
                      </p>
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {phase.parts.map((part, partIndex) => (
                          <li
                            key={part.name}
                            className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-[11px] font-medium"
                          >
                            <span className="text-muted-foreground tabular-nums">
                              {String(
                                PHASE_OFFSETS[phaseIndex] + partIndex + 1,
                              ).padStart(2, "0")}
                            </span>
                            {part.name}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ol>
              </div>
            </Section>
          )}

          <Section
            step={++step}
            title="Màu bìa"
            hint="Tông màu của thẻ lộ trình trong trang quản lý."
          >
            <fieldset>
              <legend className="sr-only">Màu bìa lộ trình</legend>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {COVER_THEMES.map((theme) => {
                  const selected = coverTheme === theme.key;
                  return (
                    <label
                      key={theme.key}
                      className={cn(
                        "flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border-2 p-2 text-xs font-semibold transition-all has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring",
                        selected
                          ? "border-primary shadow-[3px_3px_0_0_var(--brand-blue)]"
                          : "border-transparent hover:border-primary/30",
                      )}
                    >
                      <input
                        type="radio"
                        name="coverTheme"
                        value={theme.key}
                        checked={selected}
                        onChange={() => setCoverTheme(theme.key)}
                        className="sr-only"
                      />
                      <span
                        aria-hidden
                        className={cn(
                          "grid h-10 w-full place-items-center rounded-xl bg-gradient-to-br",
                          theme.className,
                        )}
                      >
                        {selected && (
                          <Check
                            className="size-4 text-primary-foreground"
                            strokeWidth={3}
                          />
                        )}
                      </span>
                      {theme.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </Section>

          {!editing && (
            <Section
              step={++step}
              title="Ai được xem"
              hint="Chọn phạm vi chia sẻ. Có thể đổi lại bất cứ lúc nào ở trang tổng quan lộ trình."
            >
              <fieldset aria-describedby="path-visibility-error">
                <legend className="sr-only">Phạm vi chia sẻ lộ trình</legend>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(
                    Object.entries(PATH_VISIBILITIES) as [
                      PathVisibility,
                      (typeof PATH_VISIBILITIES)[PathVisibility],
                    ][]
                  ).map(([value, option]) => {
                    const selected = visibility === value;
                    const Icon = VISIBILITY_ICONS[value];
                    return (
                      <label
                        key={value}
                        className={cn(
                          "relative flex cursor-pointer flex-col gap-2 rounded-2xl border-2 p-4 transition-all has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring",
                          selected
                            ? "border-primary bg-secondary/30 shadow-[3px_3px_0_0_var(--brand-blue)]"
                            : "border-border hover:border-primary/40",
                        )}
                      >
                        <input
                          type="radio"
                          name="visibility"
                          value={value}
                          checked={selected}
                          onChange={() => {
                            setVisibility(value);
                            if (fields.visibility)
                              setFields((prev) => ({
                                ...prev,
                                visibility: undefined,
                              }));
                          }}
                          className="sr-only"
                        />
                        <span className="flex items-center justify-between gap-2">
                          <span
                            aria-hidden
                            className={cn(
                              "grid size-9 place-items-center rounded-xl",
                              selected
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground",
                            )}
                          >
                            <Icon className="size-4" />
                          </span>
                          {selected && (
                            <Check
                              aria-hidden
                              className="size-4 text-primary"
                              strokeWidth={3}
                            />
                          )}
                        </span>
                        <span className="flex items-center gap-2 text-sm font-bold">
                          {option.label}
                          {value === "class" && (
                            <span className="rounded-full border border-dashed border-accent px-1.5 text-[10px] font-semibold text-accent-strong">
                              Sắp có
                            </span>
                          )}
                        </span>
                        <span className="text-xs leading-5 text-muted-foreground">
                          {option.hint}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {visibility === "class" && (
                <div className="space-y-3 rounded-2xl bg-muted/40 p-4">
                  <p className="text-sm font-semibold">
                    Chọn lớp được xem{" "}
                    <span className="font-normal text-muted-foreground">
                      ({classes.length} đã chọn)
                    </span>
                  </p>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {SAMPLE_CLASSES.map((item) => {
                      const checked = classes.includes(item.id);
                      return (
                        <li key={item.id}>
                          <label
                            className={cn(
                              "flex cursor-pointer items-center gap-3 rounded-xl border-2 bg-background p-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring",
                              checked
                                ? "border-primary"
                                : "border-transparent hover:border-primary/30",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => {
                                setClasses((all) =>
                                  event.target.checked
                                    ? [...all, item.id]
                                    : all.filter((id) => id !== item.id),
                                );
                                if (fields.visibility)
                                  setFields((prev) => ({
                                    ...prev,
                                    visibility: undefined,
                                  }));
                              }}
                              className="size-4 accent-primary"
                            />
                            <span
                              aria-hidden
                              className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-sky-light/70 text-[11px] font-bold text-primary"
                            >
                              {item.name.slice(0, 4)}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold">
                                Lớp {item.name}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {item.detail}
                              </span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Info
                      aria-hidden
                      className="mt-0.5 size-3.5 shrink-0 text-primary"
                    />
                    Chia sẻ theo lớp đang được hoàn thiện. Hiện lộ trình sẽ được
                    lưu ở chế độ Cá nhân, danh sách lớp trên là lớp mẫu.
                  </p>
                </div>
              )}

              {visibility === "public" && (
                <p className="flex items-start gap-2 rounded-2xl bg-secondary/30 p-4 text-xs leading-5 text-muted-foreground">
                  <Info
                    aria-hidden
                    className="mt-0.5 size-3.5 shrink-0 text-primary"
                  />
                  {namedLessons.length > 0
                    ? "Lộ trình sẽ được xuất bản ngay sau khi tạo xong các bài học và hiện trên trang khám phá."
                    : "Cần ít nhất 1 bài học trong đề cương để đưa lên trang khám phá."}
                </p>
              )}
              <FieldError
                id="path-visibility-error"
                message={fields.visibility}
              />
            </Section>
          )}

          <Section
            step={++step}
            title="Cấu hình học tập"
            hint="Quy tắc mở bài học cho học viên đã đăng ký."
          >
            {!editing ? (
              <label className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border-2 border-border p-4 transition-colors hover:border-primary/35">
                <span className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-secondary/70 text-primary"
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
                        ? "Học viên cần xong bài trước để mở bài tiếp theo. Có thể đổi lại sau khi tạo."
                        : "Học viên có thể mở bất kỳ bài học nào sau khi đăng ký."}
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
              <div className="flex items-start gap-3 rounded-2xl bg-muted/40 p-4 text-xs leading-5 text-muted-foreground">
                <Info
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  aria-hidden
                />
                <p>
                  <strong>Mở khóa tuần tự</strong>,{" "}
                  <strong>trạng thái xuất bản</strong> và{" "}
                  <strong>danh sách bài học</strong> được quản lý tại{" "}
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
          </Section>

          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm font-medium text-destructive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <p>{error}</p>
            </div>
          )}

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

          <div className="sticky bottom-4 z-10 flex flex-col-reverse gap-3 rounded-2xl border-2 border-primary bg-background p-4 shadow-[4px_4px_0_0_var(--brand-blue)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {progress ||
                (isDirty
                  ? "Có thay đổi chưa lưu."
                  : editing
                    ? "Mọi thông tin đang trùng khớp với bản đã lưu."
                    : "Lộ trình mới sẽ được tạo ở trạng thái Bản nháp.")}
            </p>
            <div className="flex flex-col-reverse gap-2.5 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={handleCancel}
                className="rounded-full border-border bg-background text-foreground hover:bg-muted"
              >
                Hủy
              </Button>
              <Button type="submit" disabled={pending} className="rounded-full">
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
                    : namedLessons.length > 0
                      ? `Tạo lộ trình và ${namedLessons.length} bài`
                      : "Tạo lộ trình"}
              </Button>
            </div>
          </div>
        </fieldset>
      </form>

      <aside
        aria-label="Xem trước hiển thị"
        className="space-y-4 lg:sticky lg:top-24"
      >
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Xem trước hiển thị
        </p>
        {!editing && (
          <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            Chia sẻ:
            <span className="inline-flex items-center gap-1 rounded-full border-2 border-primary/20 bg-background px-2.5 py-0.5 font-semibold text-primary">
              {PATH_VISIBILITIES[visibility].label}
              {visibility === "class" &&
                classes.length > 0 &&
                ` · ${classes.join(", ")}`}
            </span>
          </p>
        )}

        <div className="group relative flex min-h-48 overflow-hidden rounded-3xl border-2 border-primary bg-background">
          <span
            aria-hidden
            className="absolute right-0 bottom-0 h-[80%] w-[34%] rounded-tl-[70%_85%] bg-brand-sky-light"
          />
          <div className="absolute top-1/2 right-[5%] -translate-y-1/2 scale-75">
            <PathArt path={{ title, tags: parsedTags }} />
          </div>
          <div className="relative flex w-[66%] min-w-0 flex-col gap-2 p-5">
            <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Layers aria-hidden className="size-3.5 text-primary" />
              Lộ trình
              {parsedTags[0] && (
                <span className="truncate text-primary">
                  · #{parsedTags[0]}
                </span>
              )}
            </p>
            <h3 className="line-clamp-2 text-lg leading-snug font-bold break-words">
              {title.trim() || "Tên lộ trình của bạn"}
            </h3>
            <p className="line-clamp-2 text-xs text-muted-foreground break-words">
              {description.trim() || "Lời giới thiệu ngắn sẽ hiện ở đây."}
            </p>
            <p className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <DifficultyChip difficulty={difficulty} />
              {!editing && (
                <span className="inline-flex items-center gap-1">
                  <BookOpen aria-hidden className="size-3.5" />
                  {namedLessons.length} bài
                </span>
              )}
              {previewMinutes && (
                <span className="inline-flex items-center gap-1">
                  <Clock aria-hidden className="size-3.5" />
                  {formatDuration(previewMinutes)}
                </span>
              )}
            </p>
          </div>
        </div>

        {!editing && (
          <div className="rounded-3xl border-2 border-primary/15 bg-background p-5">
            <p className="text-sm font-bold">Bạn sẽ học được gì</p>
            {namedLessons.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Thêm bài học ở phần đề cương để thấy mục này.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {namedLessons.slice(0, 6).map((lesson) => (
                  <li key={lesson.key} className="flex gap-2 text-xs">
                    <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-success/15 text-success">
                      <Check aria-hidden className="size-3" strokeWidth={3} />
                    </span>
                    <span className="min-w-0">
                      <strong className="block truncate font-semibold">
                        {lesson.title}
                      </strong>
                      {lesson.description && (
                        <span className="line-clamp-2 text-muted-foreground">
                          {lesson.description}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="rounded-3xl border-2 border-primary/15 bg-background p-5">
          <p className="flex items-center justify-between text-sm font-bold">
            Mức độ hoàn thiện
            <span className="text-xs font-semibold text-primary">
              {ready}/{checklist.length}
            </span>
          </p>
          <span className="mt-2 block h-2 overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${(ready / checklist.length) * 100}%` }}
            />
          </span>
          <ul className="mt-3 space-y-1.5 text-xs">
            {checklist.map((item) => (
              <li
                key={item.label}
                className={cn(
                  "flex items-center gap-2",
                  item.done ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {item.done ? (
                  <Check
                    aria-hidden
                    className="size-3.5 text-success"
                    strokeWidth={3}
                  />
                ) : (
                  <Circle aria-hidden className="size-3.5" />
                )}
                {item.label}
                <span className="sr-only">
                  {item.done ? " (đã có)" : " (chưa có)"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
