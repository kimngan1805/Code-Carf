"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Check,
  Clock,
  EyeOff,
  Globe,
  LoaderCircle,
  Lock,
  MoreHorizontal,
  Trash2,
  Unlock,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSingleFlight } from "@/features/grading/single-flight";
import { cn } from "@/lib/utils";
import { coverThemeClass, type DIFFICULTY_LABELS } from "../cover-themes";
import { formatDuration } from "../format";
import { changePathUnlock, deletePathAction } from "../management-actions";
import { changePathPublication } from "../publication-actions";
import { DeletePathDialog, runDeletePath } from "./delete-path-button";
import { PathDifficultyBadge, PathStatusBadge } from "./path-badges";
import { PathArt } from "./path-showcase";

export interface ManagedPathCardData {
  id: string;
  slug: string;
  title: string;
  description: string;
  published: boolean;
  sequentialUnlock: boolean;
  difficulty: keyof typeof DIFFICULTY_LABELS;
  tags: string[];
  estimatedMinutes: number | null;
  coverTheme: string;
  postedLabel?: string;
  _count: {
    rooms: number;
    enrollments: number;
  };
}

export interface SequentialUnlockOverride {
  pathId: string;
  baseValue: boolean;
  value: boolean;
}

/**
 * Ưu tiên props từ server làm nguồn dữ liệu chính; chỉ áp dụng giá trị lạc quan
 * khi vẫn đang gắn với đúng `path.id` và giá trị nền chưa được server cập nhật.
 */
export function resolveSequentialUnlock(
  path: Pick<ManagedPathCardData, "id" | "sequentialUnlock">,
  override: SequentialUnlockOverride | null,
): boolean {
  if (
    override &&
    override.pathId === path.id &&
    override.baseValue === path.sequentialUnlock
  ) {
    return override.value;
  }
  return path.sequentialUnlock;
}

export function ManagedPathCard({
  path,
  initialMenuOpen = false,
}: {
  path: ManagedPathCardData;
  /** Chỉ dùng cho kiểm thử render menu hành động phụ. */
  initialMenuOpen?: boolean;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(initialMenuOpen);
  const [unlockOverride, setUnlockOverride] =
    useState<SequentialUnlockOverride | null>(null);
  const [unlockPending, setUnlockPending] = useState(false);
  const [pubPending, setPubPending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  const menuContainerRef = useRef<HTMLDivElement>(null);
  const pubInFlight = useRef(false);
  const unlockInFlight = useRef(false);
  const deleteFlightRef = useRef<ReturnType<typeof createSingleFlight> | null>(
    null,
  );

  const sequentialUnlock = resolveSequentialUnlock(path, unlockOverride);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  async function togglePublish() {
    if (pubInFlight.current) return;
    pubInFlight.current = true;
    setPubPending(true);
    setFeedback(null);
    try {
      const result = await changePathPublication({
        pathId: path.id,
        published: !path.published,
      });
      if (result.error) {
        setFeedback({ kind: "error", text: result.error });
      } else {
        setFeedback({
          kind: "success",
          text: path.published
            ? "Đã ẩn lộ trình khỏi học viên."
            : "Đã xuất bản lộ trình.",
        });
        setMenuOpen(false);
        router.refresh();
      }
    } catch {
      setFeedback({
        kind: "error",
        text: "Không thể kết nối. Vui lòng thử lại.",
      });
    } finally {
      pubInFlight.current = false;
      setPubPending(false);
    }
  }

  async function toggleUnlock() {
    if (unlockInFlight.current) return;
    unlockInFlight.current = true;
    const previousOverride =
      unlockOverride &&
      unlockOverride.pathId === path.id &&
      unlockOverride.baseValue === path.sequentialUnlock
        ? unlockOverride
        : null;
    const next = !sequentialUnlock;
    setUnlockOverride({
      pathId: path.id,
      baseValue: path.sequentialUnlock,
      value: next,
    });
    setUnlockPending(true);
    setFeedback(null);
    try {
      const result = await changePathUnlock({
        pathId: path.id,
        enabled: next,
      });
      if (result.error) {
        setUnlockOverride(previousOverride);
        setFeedback({ kind: "error", text: result.error });
      } else {
        setFeedback({
          kind: "success",
          text: next
            ? "Đã bật mở khóa bài học tuần tự."
            : "Đã chuyển sang mở bài học tự do.",
        });
        router.refresh();
      }
    } catch {
      setUnlockOverride(previousOverride);
      setFeedback({
        kind: "error",
        text: "Không thể kết nối. Vui lòng thử lại.",
      });
    } finally {
      unlockInFlight.current = false;
      setUnlockPending(false);
    }
  }

  async function confirmDelete() {
    deleteFlightRef.current ??= createSingleFlight();
    const flight = deleteFlightRef.current;
    if (flight.busy) return;
    setDeletePending(true);
    setDeleteError("");
    const outcome = await runDeletePath({
      flight,
      pathId: path.id,
      action: deletePathAction,
      onNavigate: (href) => router.push(href),
      onRefresh: () => router.refresh(),
    });
    if (!outcome.started) return;
    if (outcome.ok) {
      setDeleteOpen(false);
      setDeletePending(false);
    } else {
      setDeleteError(
        outcome.error ?? "Chưa thể xóa lộ trình. Vui lòng thử lại.",
      );
      setDeletePending(false);
    }
  }

  const duration = formatDuration(path.estimatedMinutes);
  const postedLabel = path.postedLabel ?? "";
  const visibleTags = path.tags.slice(0, 3);
  const remainingTags = path.tags.length - visibleTags.length;

  return (
    <li className="group relative flex min-w-0 flex-col overflow-hidden rounded-3xl border-2 border-primary/15 bg-background transition-all duration-200 hover:-translate-y-0.5 hover:border-primary hover:shadow-[5px_5px_0_0_var(--brand-blue)]">
      <div
        className={cn(
          "relative h-24 bg-gradient-to-br",
          coverThemeClass(path.coverTheme),
        )}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -right-6 -bottom-10 size-28 rounded-full bg-primary-foreground/15"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -top-8 right-20 size-20 rounded-full bg-primary-foreground/10"
        />
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-background/95 px-2.5 py-0.5 text-xs font-semibold text-foreground shadow-xs">
            {path.published ? (
              <Globe aria-hidden className="size-3.5 text-primary" />
            ) : (
              <EyeOff aria-hidden className="size-3.5 text-muted-foreground" />
            )}
            {path.published ? "Trang khám phá" : "Cá nhân"}
          </span>
          <PathStatusBadge published={path.published} surface="elevated" />
        </div>
        <div className="absolute -bottom-8 left-5 scale-[0.7] origin-bottom-left">
          <PathArt path={path} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-5 pt-12 pb-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <PathDifficultyBadge difficulty={path.difficulty} />
          {visibleTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border-2 border-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary"
            >
              #{tag}
            </span>
          ))}
          {remainingTags > 0 && (
            <span className="rounded-full border-2 border-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary tabular-nums">
              +{remainingTags}
            </span>
          )}
        </div>

        <div className="space-y-1.5">
          <h2 className="line-clamp-2 text-lg leading-snug font-bold text-foreground break-words">
            <Link
              href={`/gv/paths/${path.slug}`}
              className="rounded transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {path.title}
            </Link>
          </h2>
          {path.description.trim() ? (
            <p className="line-clamp-2 text-sm leading-5 text-muted-foreground break-words">
              {path.description}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground/80 italic">
              Chưa có mô tả lộ trình.
            </p>
          )}
        </div>

        <dl className="mt-auto grid grid-cols-3 gap-2 rounded-2xl bg-muted/40 p-3 text-center tabular-nums">
          <div>
            <dt className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
              <BookOpen className="size-3.5 text-primary" aria-hidden />
              Bài học
            </dt>
            <dd className="mt-0.5 text-sm font-bold">
              {path._count.rooms}
              <span className="sr-only"> bài học</span>
            </dd>
          </div>
          <div>
            <dt className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
              <Users className="size-3.5 text-primary" aria-hidden />
              Học viên
            </dt>
            <dd className="mt-0.5 text-sm font-bold">
              {path._count.enrollments}
              <span className="sr-only"> học viên</span>
            </dd>
          </div>
          <div>
            <dt className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="size-3.5 text-primary" aria-hidden />
              Thời lượng
            </dt>
            <dd className="mt-0.5 text-sm font-bold">{duration || "—"}</dd>
          </div>
        </dl>

        <p className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            {sequentialUnlock ? (
              <Lock className="size-3" aria-hidden />
            ) : (
              <Unlock className="size-3" aria-hidden />
            )}
            {sequentialUnlock ? "Tuần tự" : "Mở tự do"}
          </span>
          {postedLabel && (
            <span>
              {path.published ? "Xuất bản lúc" : "Tạo lúc"} {postedLabel}
            </span>
          )}
        </p>

        {feedback && (
          <p
            role={feedback.kind === "error" ? "alert" : "status"}
            className={cn(
              "flex items-start gap-1.5 rounded-xl border px-3 py-2 text-xs leading-5",
              feedback.kind === "error"
                ? "border-destructive/25 bg-destructive/10 text-destructive"
                : "border-success/25 bg-success/10 text-success",
            )}
          >
            {feedback.kind === "error" ? (
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            ) : (
              <Check className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            )}
            <span>{feedback.text}</span>
          </p>
        )}
      </div>

      {/* Action footer: Primary action + Overflow Menu */}
      <div className="flex items-center justify-between gap-2 border-t-2 border-dashed border-primary/15 px-5 py-3">
        <Button asChild size="sm" className="rounded-full px-4">
          <Link href={`/gv/paths/${path.slug}`}>
            Quản lý
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </Button>

        <div ref={menuContainerRef} className="relative">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`Tùy chọn cho lộ trình ${path.title}`}
            onClick={() => setMenuOpen((prev) => !prev)}
            className={cn(
              "size-9 rounded-lg px-0 text-muted-foreground hover:text-foreground",
              menuOpen && "bg-muted text-foreground",
            )}
          >
            <MoreHorizontal className="size-4" aria-hidden />
          </Button>

          {menuOpen && (
            <div
              role="menu"
              aria-label={`Hành động cho ${path.title}`}
              className="absolute right-0 bottom-full z-30 mb-2 w-60 rounded-2xl border border-border/80 bg-background p-1.5 shadow-xl"
            >
              <button
                type="button"
                role="menuitem"
                disabled={pubPending}
                onClick={togglePublish}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
              >
                {pubPending ? (
                  <LoaderCircle
                    className="size-4 shrink-0 animate-spin text-primary"
                    aria-hidden
                  />
                ) : path.published ? (
                  <EyeOff
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                ) : (
                  <Globe className="size-4 shrink-0 text-primary" aria-hidden />
                )}
                <span className="flex-1">
                  {pubPending
                    ? "Đang cập nhật..."
                    : path.published
                      ? "Ẩn lộ trình"
                      : "Xuất bản lộ trình"}
                </span>
              </button>

              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={sequentialUnlock}
                disabled={unlockPending}
                onClick={toggleUnlock}
                className="flex w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
              >
                <span className="flex items-center gap-2.5">
                  {unlockPending ? (
                    <LoaderCircle
                      className="size-4 shrink-0 animate-spin text-primary"
                      aria-hidden
                    />
                  ) : sequentialUnlock ? (
                    <Lock
                      className="size-4 shrink-0 text-primary"
                      aria-hidden
                    />
                  ) : (
                    <Unlock
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                  )}
                  <span>Mở khóa tuần tự</span>
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    sequentialUnlock
                      ? "bg-secondary text-secondary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {sequentialUnlock ? "Bật" : "Tắt"}
                </span>
              </button>

              <div role="separator" className="my-1.5 h-px bg-border/70" />

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setDeleteError("");
                  setDeleteOpen(true);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-2 focus-visible:outline-ring"
              >
                <Trash2 className="size-4 shrink-0" aria-hidden />
                <span>Xóa lộ trình</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <DeletePathDialog
        open={deleteOpen}
        pathTitle={path.title}
        pending={deletePending}
        error={deleteError}
        onClose={() => {
          if (!deletePending) setDeleteOpen(false);
        }}
        onConfirm={confirmDelete}
      />
    </li>
  );
}
